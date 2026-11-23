import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchRules, createRule, updateRule, deleteRule, resetRules,
  fetchCategoryPreferences, updateCategoryPreference, deleteCategoryPreference } from '../services/api';
import { combineClassificationSettings } from '../services/classificationSettings';

export function useClassificationSettings({ categoryRecords, onRulesChange }) {
  const [rules, setRules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [revision, setRevision] = useState(0);
  const mounted = useRef(false);
  const loadingVersion = useRef(0);
  const saving = useRef(false);

  const load = useCallback(() => {
    const version = ++loadingVersion.current;
    return Promise.all([fetchRules(), fetchCategoryPreferences()]).then(([ruleResponse, preferenceResponse]) => {
      const next = combineClassificationSettings(ruleResponse?.data, preferenceResponse?.data);
      if (mounted.current && version === loadingVersion.current) setRules(next);
    }).catch((error) => {
      if (mounted.current && version === loadingVersion.current) setLoadError(error.message || 'Não foi possível carregar suas configurações.');
    }).finally(() => {
      if (mounted.current && version === loadingVersion.current) setIsLoading(false);
    });
  }, []);

  const reload = () => {
    setIsLoading(true);
    setLoadError('');
    return load();
  };

  useEffect(() => {
    mounted.current = true;
    load();
    return () => { mounted.current = false; loadingVersion.current += 1; };
  }, [load]);

  const mutate = async (operation) => {
    if (saving.current) throw new Error('Aguarde a operação atual terminar.');
    saving.current = true;
    setIsSaving(true);
    try {
      await operation();
      if (!mounted.current) return;
      await reload();
      if (!mounted.current) return;
      await onRulesChange?.();
      if (mounted.current) setRevision((value) => value + 1);
    } finally {
      saving.current = false;
      if (mounted.current) setIsSaving(false);
    }
  };

  const save = (fields) => mutate(async () => {
    if (fields.type === 'exact') {
      await updateCategoryPreference(fields.preferenceId, fields.categoryId);
    } else {
      const category = categoryRecords.find((item) => item.name === fields.category);
      const payload = { ...fields, categoryId: category?.id };
      if (fields.id) await updateRule(fields.id, payload);
      else await createRule(payload);
    }
  });
  const remove = (id) => mutate(async () => {
    const setting = rules.find((rule) => rule.id === id);
    if (!setting) throw new Error('Configuração não encontrada.');
    if (setting.type === 'exact') await deleteCategoryPreference(setting.preferenceId);
    else await deleteRule(id);
  });
  const reset = () => mutate(() => resetRules());
  return { rules, isLoading, isSaving, loadError, revision, reload, save, remove, reset };
}
