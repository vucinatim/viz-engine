import { useEffect } from 'react';

import { AllComps } from '@/components/comps';
import type { Comp } from '@/components/config/create-component';
import useCompStore from '@/lib/stores/comp-store';

export default function EditorCompRegistryManager() {
  useEffect(() => {
    AllComps.forEach((comp) => useCompStore.getState().addComp(comp as Comp));

    return () => {
      AllComps.forEach((comp) => useCompStore.getState().removeComp(comp.name));
    };
  }, []);

  return null;
}
