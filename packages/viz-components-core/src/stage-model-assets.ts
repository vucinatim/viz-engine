import type {
  VizAssetRef,
  VizResolvedAsset,
} from "@viz-engine/contracts";

export const STAGE_MODEL_ASSET_IDS = {
  dj: "viz-builtin-stage-female-dj",
  femaleDancer: "viz-builtin-stage-female-dancer",
  maleDancer: "viz-builtin-stage-male-dancer",
  maleCheer: "viz-builtin-stage-male-cheer",
} as const;

export type VizStageModelAssetRole =
  keyof typeof STAGE_MODEL_ASSET_IDS;

export interface VizStageModelAssetDefinition {
  role: VizStageModelAssetRole;
  inputKey: string;
  bundlePath: string;
  asset: VizAssetRef;
}

const createStageModelAsset = ({
  id,
  label,
  fileName,
  contentIdentity,
  role,
}: {
  id: string;
  label: string;
  fileName: string;
  contentIdentity: string;
  role: VizStageModelAssetRole;
}): VizAssetRef => ({
  id,
  kind: "model",
  source: "bundle",
  label,
  mimeType: "application/vnd.autodesk.fbx",
  originalFileName: fileName,
  metadata: {
    contentIdentity,
    modelFormat: "fbx",
    stageRole: role,
  },
});

export const STAGE_MODEL_ASSET_DEFINITIONS: readonly VizStageModelAssetDefinition[] =
  [
    {
      role: "dj",
      inputKey: "djModel",
      bundlePath: "/models/stage/female-dj.fbx",
      asset: createStageModelAsset({
        id: STAGE_MODEL_ASSET_IDS.dj,
        label: "Stage Female DJ",
        fileName: "female-dj.fbx",
        contentIdentity:
          "sha256:87c7b85a746330c4423bf0598ae0356a9289299316030d46cf067f7fc9cd9c16",
        role: "dj",
      }),
    },
    {
      role: "femaleDancer",
      inputKey: "femaleDancerModel",
      bundlePath: "/models/stage/female-dancer.fbx",
      asset: createStageModelAsset({
        id: STAGE_MODEL_ASSET_IDS.femaleDancer,
        label: "Stage Female Dancer",
        fileName: "female-dancer.fbx",
        contentIdentity:
          "sha256:fd6847858a95d9de88e64d0c070b44e95b3c822bf3231ff347f2832dc9396479",
        role: "femaleDancer",
      }),
    },
    {
      role: "maleDancer",
      inputKey: "maleDancerModel",
      bundlePath: "/models/stage/male-dancer.fbx",
      asset: createStageModelAsset({
        id: STAGE_MODEL_ASSET_IDS.maleDancer,
        label: "Stage Male Dancer",
        fileName: "male-dancer.fbx",
        contentIdentity:
          "sha256:c9cf2a023a282b391534e8a10a91092438def435d786e9d12309ef367eb43582",
        role: "maleDancer",
      }),
    },
    {
      role: "maleCheer",
      inputKey: "maleCheerModel",
      bundlePath: "/models/stage/male-cheer.fbx",
      asset: createStageModelAsset({
        id: STAGE_MODEL_ASSET_IDS.maleCheer,
        label: "Stage Male Cheer",
        fileName: "male-cheer.fbx",
        contentIdentity:
          "sha256:354aab94cf2a971baf58f4007ab0eecfa379126f1a11d421a56dd8f68ee3959b",
        role: "maleCheer",
      }),
    },
  ];

export const resolveBundledStageModelAssets = (
  assetRefs: readonly VizAssetRef[],
): VizResolvedAsset[] => {
  const requestedAssetIds = new Set(assetRefs.map((asset) => asset.id));

  return STAGE_MODEL_ASSET_DEFINITIONS.flatMap((definition) => {
    if (!requestedAssetIds.has(definition.asset.id)) {
      return [];
    }

    return [
      {
        id: definition.asset.id,
        kind: "model",
        source: "bundle",
        uri: definition.bundlePath,
        ...(definition.asset.mimeType
          ? { mimeType: definition.asset.mimeType }
          : {}),
        ...(definition.asset.metadata
          ? { metadata: definition.asset.metadata }
          : {}),
      },
    ];
  });
};
