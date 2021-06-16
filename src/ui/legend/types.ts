import { ShapeAttrs, GroupCfg } from '../../types';

/**
 * 图例标题 配置项
 */
type LegendTitleCfg = {
  /**
   * 标题同图例项的间距
   * @type {number}
   */
  spacing?: number;
  /**
   * 文本配置项
   * @type {ShapeAttrs}
   */
  style?: ShapeAttrs;
};

/**
 * 图例背景框 配置项
 */
type LegendBackgroundCfg = {};

type LegendBaseCfg = {
  /**
   * 布局方式： horizontal，vertical
   * @type {String}
   */
  layout?: string;
  /**
   * 位置 x
   * @type {number}
   */
  x?: number;
  /**
   * 位置 y
   * @type {number}
   */
  y?: number;
  /**
   * 标题
   * @type {LegendTitleCfg}
   */
  title?: LegendTitleCfg;
  /**
   * 背景框配置项
   * @type {LegendBackgroundCfg}
   */
  background?: LegendBackgroundCfg;
};

/** 分类型图例 marker 配置项 */
type LegendMarkerCfg = {};

/**
 * 分类型图例 分页器配置项
 */
type LegendPageNavigatorCfg = {};

/**
 * 分类型图例 配置项
 */
interface CategoryLegendCfg extends LegendBaseCfg {
  /**
   * 图例项水平方向的间距
   * @type {number}
   */
  itemSpacing?: number;
  /**
   * 图例项的最大宽度，默认为 null，由上层传入
   */
  maxItemWidth?: number;
  /**
   * 图例项的宽度, 默认为 null，自动计算
   * @type {number}
   */
  itemWidth?: number;
  /**
   * 图例的高度，默认为 null
   * @type {[type]}
   */
  itemHeight?: number;
  /**
   * 图例项 name 文本的配置
   * @type {LegendItemNameCfg}
   */
  // itemName?: LegendItemNameCfg;
  /**
   * 图例项 value 附加值的配置项
   * @type {LegendItemValueCfg}
   */
  // itemValue?: LegendItemValueCfg;
  /**
   * 最大宽度
   * @type {number}
   */
  maxWidth?: number;
  /**
   * 最大高度
   * @type {number}
   */
  maxHeight?: number;
  /**
   * 图例项的 marker 图标的配置
   * @type {LegendMarkerCfg}
   */
  marker?: LegendMarkerCfg;
  /**
   * 图例项集合
   * @type {ListItem[]}
   */
  // items: ListItem[];
  /**
   * 分页器配置
   * @type {LegendPageNavigatorCfg}
   */
  flipNavigation: LegendPageNavigatorCfg;
}

/**
 * 连续型图例 track 选择范围的色块配置项
 */
type ContinueLegendTrackCfg = {};

/**
 * 连续型图例 rail 滑轨的配置项：图例滑轨（背景）的配置项
 */
type ContinueLegendRailCfg = {};

/**
 * 连续型图例文本 label 的配置项
 */
type ContinueLegendLabelCfg = {};

/**
 * 连续型图例 handler 滑块配置项
 */
type ContinueLegendHandlerCfg = {};

/**
 * 连续型图例 配置项
 */
interface ContinueLegendCfg extends LegendBaseCfg {
  /**
   * 选择范围的最小值
   * @type {number}
   */
  min: number;
  /**
   * 选择范围的最大值
   * @type {number}
   */
  max: number;
  /**
   * 选择的值
   * @type {number[]}
   */
  value: number[];
  /**
   * 图例的颜色，可以写多个颜色
   * @type {number[]}
   */
  colors: number[];
  /**
   * 选择范围的色块配置项
   * @type {ContinueLegendTrackCfg}
   */
  track: ContinueLegendTrackCfg;
  /**
   * 图例滑轨（背景）的配置项
   * @type {ContinueLegendRailCfg}
   */
  rail: ContinueLegendRailCfg;
  /**
   * 文本的配置项
   * @type {ContinueLegendLabelCfg}
   */
  label: ContinueLegendLabelCfg;
  /**
   * 滑块的配置项
   * @type {ContinueLegendHandlerCfg}
   */
  handler: ContinueLegendHandlerCfg;
  /**
   * 是否可以滑动
   * @type {boolean}
   */
  slidable: boolean;
}

/**
 * 图例配置项
 *
 * 1. type: 图例类型
 * 2. attrs: 图例配置属性
 */
export type LegendOptions =
  | (GroupCfg & {
      /**
       * 图例类型
       */
      type: 'category';
      attrs: CategoryLegendCfg;
    })
  | (GroupCfg & {
      type: 'continue';
      attrs: ContinueLegendCfg;
    });
