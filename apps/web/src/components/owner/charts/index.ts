// Graphiques de l'espace Propriétaire — SVG et CSS faits main, sans dépendance
// de graphisme (décision §11-Q1(a)).
export { BarChart, type BarChartProps } from './BarChart';
export { DonutChart, type DonutChartProps } from './DonutChart';
export { Histogram, type HistogramProps } from './Histogram';
export { LineChart, type LineChartProps, type LineSeries } from './LineChart';
export { StackedBar, type StackedBarProps } from './StackedBar';
export { Heatmap, type HeatmapProps } from './Heatmap';
export {
  useChartTooltip,
  type ContenuInfobulle,
  type LigneInfobulle,
} from './ChartTooltip';
