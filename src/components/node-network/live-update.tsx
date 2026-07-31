import { runtimeInspection } from '@/lib/viz-session';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';

type LiveUpdate = () => void;
type RegisterLiveUpdate = (update: LiveUpdate) => () => void;

const GraphLiveUpdateContext = createContext<RegisterLiveUpdate | null>(null);

/**
 * Owns the graph UI's single runtime-to-display subscription. Consumers
 * register imperative paint callbacks; one animation frame fans the latest
 * runtime result out to the visible graph and collapses duplicate publishes.
 */
export const GraphLiveUpdateProvider = ({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) => {
  const updatesRef = useRef(new Set<LiveUpdate>());
  const register = useCallback<RegisterLiveUpdate>((update) => {
    updatesRef.current.add(update);
    return () => {
      updatesRef.current.delete(update);
    };
  }, []);

  useEffect(() => {
    if (!active) {
      return;
    }

    let frame: number | null = null;
    const publish = () => {
      if (frame !== null) {
        return;
      }
      frame = requestAnimationFrame(() => {
        frame = null;
        updatesRef.current.forEach((update) => update());
      });
    };
    const unsubscribe = runtimeInspection.subscribe(publish);
    publish();

    return () => {
      unsubscribe();
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
    };
  }, [active]);

  return (
    <GraphLiveUpdateContext.Provider value={register}>
      {children}
    </GraphLiveUpdateContext.Provider>
  );
};

export const useGraphLiveUpdate = (update: LiveUpdate): void => {
  const register = useContext(GraphLiveUpdateContext);
  const updateRef = useRef(update);
  updateRef.current = update;
  const publish = useCallback(() => updateRef.current(), []);

  useEffect(() => register?.(publish), [publish, register]);
};
