'use client';

import { destructureParameterId } from '@/lib/id-utils';
import useLayerStore from '@/lib/stores/layer-store';
import { useCallback, useMemo } from 'react';
import useNodeNetworkStore, {
  useEnabledNetworkIds,
} from '../node-network/node-network-store';
import { Badge } from '../ui/badge';
import SearchSelect from '../ui/search-select';
import AnimationItem from './animation-item';
import LazyNodeNetworkPreview from './lazy-node-network-preview';

/**
 * Dropdown component for viewing and navigating enabled animations
 * Shows visual previews of node networks for quick recognition
 */
const EnabledAnimationsDropdown = () => {
  // Use optimized selector to only get enabled parameter IDs (not full networks)
  // This prevents rerenders when node positions change or disabled networks change
  const enabledNetworkIds = useEnabledNetworkIds();
  const setOpenNetwork = useNodeNetworkStore((state) => state.setOpenNetwork);
  const openNetwork = useNodeNetworkStore((state) => state.openNetwork);
  const setShouldForceShowOverlay = useNodeNetworkStore(
    (state) => state.setShouldForceShowOverlay,
  );
  const layers = useLayerStore((state) => state.layers);

  // Memoize the click handler
  const handleSelect = useCallback(
    (animation: any) => {
      setOpenNetwork(animation.parameterId);
      setShouldForceShowOverlay(true);
    },
    [setOpenNetwork, setShouldForceShowOverlay],
  );

  // Check if animation is currently active
  const isActiveAnimation = useCallback(
    (animation: any) => {
      return openNetwork === animation.parameterId;
    },
    [openNetwork],
  );

  // Group enabled animations by layer in the same order as the layer stack
  const groupedAnimations = useMemo(() => {
    // First, collect all enabled animations with their metadata
    const allAnimations = enabledNetworkIds.map((parameterId) => {
      const info = destructureParameterId(parameterId);
      const layer = layers.find((l) => l.id === info.layerId);

      return {
        parameterId,
        ...info,
        layerName: layer?.comp.name || info.componentName,
        layerId: info.layerId,
      };
    });

    // Group by layer in reversed order (to match the visual layer stack)
    const grouped = [...layers]
      .reverse()
      .map((layer) => {
        const animationsInLayer = allAnimations.filter(
          (anim) => anim.layerId === layer.id,
        );

        if (animationsInLayer.length === 0) return null;

        return {
          groupLabel: layer.comp.name,
          items: animationsInLayer,
        };
      })
      .filter((group): group is NonNullable<typeof group> => group !== null);

    return grouped;
  }, [enabledNetworkIds, layers]);

  // Memoize render functions to prevent recreating them
  const renderOption = useCallback((animation: any, isActive: boolean) => {
    return (
      <AnimationItem
        displayName={animation.displayName}
        layerName={animation.layerName}
        groupPath={animation.groupPath}
        parameterId={animation.parameterId}
        isActive={isActive}
      />
    );
  }, []);

  const renderPreview = useCallback((animation: any, isHovered: boolean) => {
    return (
      <LazyNodeNetworkPreview
        parameterId={animation.parameterId}
        isHovered={isHovered}
        width={120}
        height={68}
      />
    );
  }, []);

  const extractKey = useCallback(
    (animation: any) =>
      `${animation.displayName} ${animation.fullPath} ${animation.layerName} ${animation.componentName}`,
    [],
  );

  // Count total animations across all groups
  const totalAnimations = groupedAnimations.reduce(
    (sum, group) => sum + group.items.length,
    0,
  );

  return (
    <div className="flex items-center">
      <SearchSelect
        trigger={
          <div className="flex items-center gap-2">
            <span
              className={
                totalAnimations > 0 ? 'text-purple-300' : 'text-foreground'
              }>
              Animations
            </span>
            {totalAnimations > 0 && (
              <Badge
                variant="secondary"
                className="h-5 min-w-[20px] px-1.5 text-[10px]">
                {totalAnimations}
              </Badge>
            )}
          </div>
        }
        triggerClassName="h-auto border-0 bg-transparent px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"
        dropdownWidth={360}
        groupedOptions={groupedAnimations}
        extractKey={extractKey}
        renderOption={renderOption}
        renderPreview={renderPreview}
        noItemsMessage="No active animations"
        placeholder="Search animations..."
        onSelect={handleSelect}
        isActive={isActiveAnimation}
        keepOpenOnSelect={true}
      />
    </div>
  );
};

export default EnabledAnimationsDropdown;
