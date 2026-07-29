export interface NodeNetworkMetric {
  parameterId: string;
  parameterName: string;
  computeTime: number;
  nodeCount: number;
}

type NodeNetworkMetricSink = (metric: NodeNetworkMetric) => void;

let metricSink: NodeNetworkMetricSink | null = null;

export const registerNodeNetworkMetricSink = (
  sink: NodeNetworkMetricSink | null,
) => {
  metricSink = sink;
};

export const reportNodeNetworkMetric = (metric: NodeNetworkMetric) => {
  metricSink?.(metric);
};
