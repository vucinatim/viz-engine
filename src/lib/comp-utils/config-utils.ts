import {
  BaseConfigOption,
  ConfigParam,
  GroupConfigOption,
  VConfigType,
} from '@/components/config/config';

const assignIdsRecursively = (
  prefix: string,
  options: Record<string, BaseConfigOption<any>>,
) => {
  for (const key in options) {
    const option = options[key];
    const newId = `${prefix}:${key}`;
    option.id = newId;
    if (option instanceof GroupConfigOption) {
      assignIdsRecursively(newId, option.options);
    }
  }
};

export const assignDeterministicIdsToConfig = (
  layerId: string,
  config: VConfigType,
) => {
  assignIdsRecursively(layerId, config.options);
  return config;
};

const getParameterIdsRecursively = (
  options: Record<string, BaseConfigOption<any>>,
  ids: string[],
) => {
  for (const key in options) {
    const option = options[key];
    if (option instanceof GroupConfigOption) {
      getParameterIdsRecursively(option.options, ids);
    } else if (option instanceof ConfigParam) {
      ids.push(option.id);
    }
  }
};

export const getParameterIdsFromConfig = (config: VConfigType): string[] => {
  const ids: string[] = [];
  getParameterIdsRecursively(config.options, ids);
  return ids;
};
