import { coreCatalogComponents } from '@viz-engine/components-core';
import type { Comp } from '../config/create-component';
import { createEditorCompFromDefinition } from '../config/create-component-from-authoring';

export const AllComps = coreCatalogComponents.map(
  createEditorCompFromDefinition,
);

export const CompDefinitionMap = new Map<string, Comp>();
AllComps.forEach((comp) => CompDefinitionMap.set(comp.name, comp));
