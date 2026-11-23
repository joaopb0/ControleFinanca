import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchCategories, createCategory, updateCategory, deleteCategory, saveCategoryPreference, classifyTransactions } from '../services/api';
import { reconcileCategories, applyCategoryChoice, removeTransaction as removeTransactionById } from '../services/categoryState';

/** Catálogo e extrato pertencem à aplicação autenticada; desmontam na troca de conta. */
export function useCategories() {
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const rowsRef = useRef([]);
  const categoriesRef = useRef([]);
  const catalogVersionRef = useRef(0);
  const versionRef = useRef(0);
  const mountedRef = useRef(false);
  const savingRef = useRef(false);

  const changeCategories = useCallback((next) => {
    catalogVersionRef.current += 1;
    categoriesRef.current = next;
    setCategories(next);
  }, []);

  const changeTransactions = useCallback((rows) => {
    versionRef.current += 1;
    const next = reconcileCategories(rows, categoriesRef.current);
    rowsRef.current = next;
    setTransactions(next);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; versionRef.current += 1; };
  }, []);

  const reclassify = useCallback(async () => {
    if (!rowsRef.current.length) return;
    const version = versionRef.current;
    try {
      const response = await classifyTransactions({ transactions: rowsRef.current });
      if (mountedRef.current && version === versionRef.current) changeTransactions(response.data);
    } catch (err) {
      if (mountedRef.current) setError(`As configurações foram salvas, mas não foi possível reclassificar o extrato: ${err.message}`);
    }
  }, [changeTransactions]);

  const refresh = useCallback(async ({ reclassifyRows = false } = {}) => {
    const version = catalogVersionRef.current;
    const response = await fetchCategories();
    if (!mountedRef.current || version !== catalogVersionRef.current) return;
    changeCategories(response.data);
    changeTransactions(reconcileCategories(rowsRef.current, response.data));
    if (reclassifyRows) await reclassify();
    return response.data;
  }, [changeCategories, changeTransactions, reclassify]);

  useEffect(() => {
    let active = true;
    fetchCategories().then((response) => { if (active) changeCategories(response.data); })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [changeCategories]);

  const mutate = async (operation) => {
    if (savingRef.current) throw new Error('Aguarde a operação atual terminar.');
    savingRef.current = true;
    setIsSaving(true);
    setError('');
    try { return await operation(); }
    finally { savingRef.current = false; if (mountedRef.current) setIsSaving(false); }
  };

  const save = (category, fields) => mutate(async () => {
    const response = category ? await updateCategory(category.id, fields) : await createCategory(fields);
    if (!mountedRef.current) return;
    const next = category ? categoriesRef.current.map((item) => item.id === category.id ? response.data : item) : [...categoriesRef.current, response.data];
    changeCategories(next);
    changeTransactions(reconcileCategories(rowsRef.current, next));
    return response.data;
  });

  const remove = (id) => mutate(async () => {
    await deleteCategory(id);
    if (!mountedRef.current) return;
    const next = categoriesRef.current.filter((category) => category.id !== id);
    changeCategories(next);
    // Exclusão move os lançamentos para o fallback, sem inferir outra categoria.
    changeTransactions(reconcileCategories(rowsRef.current, next));
  });

  const choose = (transactionId, categoryId, remember = false) => mutate(async () => {
    const selected = rowsRef.current.find((row) => row.id === transactionId);
    const category = categoriesRef.current.find((item) => item.id === categoryId);
    if (!selected || !category) throw new Error('Lançamento ou categoria não encontrado.');
    const preference = remember ? await saveCategoryPreference({ description: selected.description, categoryId }) : null;
    if (!mountedRef.current) return;
    changeTransactions(applyCategoryChoice(rowsRef.current, selected, category, remember, preference?.data?.id));
  });

  const removeTransaction = (id) => mutate(() => {
    changeTransactions(removeTransactionById(rowsRef.current, id));
  });

  const rulesChanged = async () => {
    try { setError(''); await refresh({ reclassifyRows: true }); }
    catch (err) { if (mountedRef.current) setError(`As regras foram salvas. Não foi possível atualizar o extrato: ${err.message}`); }
  };

  const retry = async () => {
    setIsLoading(true);
    setError('');
    try { await refresh(); }
    catch (err) { if (mountedRef.current) setError(err.message); }
    finally { if (mountedRef.current) setIsLoading(false); }
  };

  const colors = useMemo(() => Object.fromEntries(categories.map((category) => [category.name, category.color])), [categories]);
  const names = useMemo(() => categories.map((category) => category.name), [categories]);
  return { categories, colors, names, transactions, changeTransactions, isLoading, isSaving, error, retry, save, remove, choose, removeTransaction, rulesChanged };
}
