import { Group, Path, Text } from '@antv/g';
import { clone, deepMix, minBy, maxBy, get, pick, sortBy, isString, isNumber } from '@antv/util';
import { vec2 } from '@antv/matrix-util';
import type { vec2 as Vector } from '@antv/matrix-util';
import type { PathCommand } from '@antv/g';
import type { MarkerCfg } from '../marker';
import type {
  Point,
  AxisType,
  TickDatum,
  AxisBaseCfg,
  AxisBaseOptions,
  AxisTitleCfg,
  AxisLineCfg,
  AxisTickLineCfg,
  AxisSubTickLineCfg,
  AxisLabelCfg,
  OverlapType,
} from './types';
import type { ShapeAttrs, StyleState as State, TextProps, PathProps } from '../../types';
import type { TimeScale } from '../../util';
import { GUI } from '../../core/gui';
import { Marker } from '../marker';
import {
  getStateStyle,
  measureTextWidth,
  getEllipsisText,
  toThousands,
  toKNotation,
  toScientificNotation,
  getTimeScale,
  getMask,
  formatTime,
  getTimeStart,
  scale as timeScale,
} from '../../util';
import { getVectorsAngle, centerRotate, formatAngle } from './utils';
import { AXIS_BASE_DEFAULT_OPTIONS, NULL_ARROW, NULL_TEXT, COMMON_TIME_MAP } from './constant';
import { isLabelsOverlap, isTextOverlap } from './overlap/is-overlap';

interface IAxisLineCfg {
  style: ShapeAttrs;
  arrow: {
    start: MarkerCfg & {
      rotate: number;
    };
    end: MarkerCfg & {
      rotate: number;
    };
  };
  line: PathProps;
}

interface ITicksCfg {
  tickLines: PathProps[];
  subTickLines: PathProps[];
  labels: TextProps[];
}

// 注册轴箭头
// ->
Marker.registerSymbol('axis-arrow', (x: number, y: number, r: number) => {
  return [['M', x, y], ['L', x - r, y - r], ['L', x + r, y], ['L', x - r, y + r], ['Z']];
});

export abstract class AxisBase<T extends AxisBaseCfg> extends GUI<Required<T>> {
  public static tag = 'axisBase';

  // 标题
  protected titleShape!: Text;

  // 轴线
  protected axisLineShape!: Group;

  // 刻度
  // protected ticksShape: Ticks;

  private tickLinesGroup!: Group;

  private labelsGroup!: Group;

  private subTickLinesGroup!: Group;

  protected static defaultOptions = {
    type: AxisBase.tag,
    ...AXIS_BASE_DEFAULT_OPTIONS,
  };

  constructor(options: AxisBaseOptions) {
    super(deepMix({}, AxisBase.defaultOptions, options));
  }

  public init() {
    this.initShape();
    // 绘制title
    this.updateTitleShape();
    // 绘制轴线
    this.updateAxisLineShape();
    // 绘制刻度与子刻度以及label
    this.updateTicksShape();
  }

  public update(cfg: Partial<T>) {
    this.attr(deepMix({}, this.attributes, cfg));
    // 更新title
    this.updateTitleShape();
    // 更新轴线
    this.updateAxisLineShape();
    // 更新刻度与子刻度\刻度文本
    this.updateTicksShape();
  }

  public clear() {}

  /**
   * 设置value对应的tick的状态样式
   */
  public setTickState(value: number): void {}

  /**
   * 设置label旋转角度
   */
  public setLabelEulerAngles(angle: number): void {
    this.getLabels().forEach((label) => {
      const labelVal = label.attr('value');
      const tickAngle = getVectorsAngle([1, 0], this.getVerticalVector(labelVal));
      const { rotate, textAlign } = this.getLabelLayout(labelVal, tickAngle, formatAngle(angle));
      label.attr({ textAlign });
      label.setEulerAngles(rotate);
    });
  }

  /**
   * 获取label旋转角度
   */
  public getLabelEulerAngles() {
    return this.getLabels()[0]?.getEulerAngles() || 0;
  }

  /**
   * 生成轴线path
   */
  protected abstract getAxisLinePath(): PathCommand[];

  /**
   * 获取给定 value 在轴上的切线向量
   */
  protected abstract getTangentVector(value: number): Vector;

  /**
   * 获取给定 value 在轴上刻度的向量
   */
  protected abstract getVerticalVector(value: number): Vector;

  /**
   * 获取value值对应的位置
   */
  protected abstract getValuePoint(value: number): Point;

  /**
   * 获取线条两端点及其方向向量
   */
  protected abstract getTerminals(): { startPos: Point; endPos: Point };

  /**
   * 获取不同位置的 label 的对齐方式和旋转角度
   * @param labelVal {number} label的值
   * @param tickAngle {number} label对应的刻度角度
   * @param angle {number} label的旋转角度
   */
  protected abstract getLabelLayout(labelVal: number, tickAngle: number, angle: number): ShapeAttrs;

  /**
   * 获得带状态样式
   */
  protected getStyle(name: string | string[], state: State = 'default') {
    return getStateStyle(get(this.attributes, name), state);
  }

  private initShape() {
    // 初始化group
    // 标题
    this.titleShape = new Text({
      name: 'title',
      style: {
        text: AxisBase.defaultOptions.style.title.content,
      },
    });
    this.appendChild(this.titleShape);
    /** ------------轴线分组-------------------- */
    this.axisLineShape = new Group({
      name: 'axis',
    });
    this.appendChild(this.axisLineShape);
    // 轴线
    const axisLine = new Path({
      name: 'line',
      style: {
        path: [],
      },
    });
    this.axisLineShape.appendChild(axisLine);
    // start arrow
    const startArrow = new Marker({
      name: 'arrow',
      style: {
        ...NULL_ARROW,
        identity: 'start',
      },
    });
    // end arrow
    const endArrow = new Marker({
      name: 'arrow',
      style: {
        ...NULL_ARROW,
        identity: 'end',
      },
    });
    this.axisLineShape.appendChild(startArrow);
    this.axisLineShape.appendChild(endArrow);

    /** ------------刻度分组-------------------- */
    this.tickLinesGroup = new Group({
      name: 'tickLinesGroup',
    });
    this.appendChild(this.tickLinesGroup);
    // 子刻度分组
    this.subTickLinesGroup = new Group({
      name: 'subTickLinesGroup',
    });
    this.appendChild(this.subTickLinesGroup);
    // 标题分组
    this.labelsGroup = new Group({
      name: 'labelsGroup',
    });
    this.appendChild(this.labelsGroup);
  }

  /**
   * 获得title属性
   */
  private getTitleCfg(): TextProps {
    const { title } = this.attributes;
    if (!title) return NULL_TEXT;
    const {
      content,
      style,
      position,
      offset: [ox, oy],
      rotate,
    } = title as Required<AxisTitleCfg>;
    // 根据 position 确定位置和对齐方式
    let titleVal: number;
    const alignAttrs = {
      textAlign: 'center' as 'center' | 'start' | 'end',
      textBaseline: 'middle' as 'middle',
    };

    if (position === 'start') {
      alignAttrs.textAlign = 'start';
      titleVal = 0;
    } else if (position === 'center') {
      alignAttrs.textAlign = 'center';
      titleVal = 0.5;
    } else {
      // position === 'end'
      alignAttrs.textAlign = 'end';
      titleVal = 1;
    }

    // 获取title
    const [x, y] = this.getValuePoint(titleVal);
    return {
      x: x + ox,
      y: y + oy,
      text: content,
      fillOpacity: 1,
      ...alignAttrs,
      ...style,
      rotate: rotate !== undefined ? rotate : getVectorsAngle([1, 0], this.getTangentVector(titleVal)),
    };
  }

  /**
   * 创建title
   */
  private updateTitleShape() {
    const { rotate, ...style } = this.getTitleCfg();
    this.titleShape.attr(style);
    centerRotate(this.titleShape, rotate);
  }

  /**
   * 获得轴线属性
   */
  private getAxisLineCfg(): IAxisLineCfg {
    const { type, line } = this.attributes;
    if (!line) {
      // 返回空line
      return {
        style: {},
        arrow: {
          start: { ...NULL_ARROW, rotate: 0 },
          end: { ...NULL_ARROW, rotate: 0 },
        },
        line: {
          path: [],
        },
      };
    }
    const { style, arrow } = line as Required<AxisLineCfg>;
    const { start, end } = arrow!;
    const {
      startPos: [x1, y1],
      endPos: [x2, y2],
    } = this.getTerminals();

    const getArrowAngle = (val: number) => {
      if (type === 'linear') return getVectorsAngle([1, 0], this.getTangentVector(val));
      return getVectorsAngle([0, -1], this.getVerticalVector(val));
    };

    return {
      style,
      arrow: {
        start: {
          ...(!start ? NULL_ARROW : start),
          x: x1,
          y: y1,
          rotate: getArrowAngle(0),
        },
        end: {
          ...(!end ? NULL_ARROW : end),
          x: x2,
          y: y2,
          rotate: getArrowAngle(1),
        },
      },
      line: {
        path: this.getAxisLinePath(),
      },
    };
  }

  private getAxisLine(subNode?: 'line' | 'start' | 'end') {
    if (!subNode) return this.axisLineShape;
    if (subNode === 'line') return this.axisLineShape.getElementsByName('line')[0]! as Path;
    let arrow!: Marker;
    (this.axisLineShape.getElementsByName('arrow')! as [Marker, Marker]).forEach((arw) => {
      if (arw.attr('identity') === subNode) arrow = arw;
    });
    return arrow;
  }

  /**
   * 更新轴线和箭头
   */
  private updateAxisLineShape() {
    const { arrow, line, style: lineStyle } = this.getAxisLineCfg();
    // 更新 line
    (this.getAxisLine('line') as Path).attr({
      ...line,
      ...lineStyle,
      fillOpacity: 0,
    });

    Object.entries(arrow).forEach(([key, { rotate: angle, ...style }]) => {
      const arw = this.getAxisLine(key as 'start' | 'end') as Marker;
      arw.update({
        identity: key,
        ...lineStyle,
        ...style,
      });
      arw.setLocalEulerAngles(angle);
    });
  }

  /**
   * 获取对应的tick
   */
  private getTickLineShape(idx: number) {
    return this.tickLinesGroup.getElementsByName('tickLine').filter((tickLine) => {
      if (tickLine.attr('identity') === idx) return true;
      return false;
    })[0] as Path;
  }

  /** ------------------------------绘制刻度线与label------------------------------------------ */
  /**
   * 获取刻度数据
   */
  private getTicksData(): Required<TickDatum>[] {
    const { ticks, ticksThreshold } = this.attributes;
    let ticksCopy = clone(ticks) as TickDatum[];
    const len = ticksCopy.length;
    sortBy(ticksCopy, (tick: TickDatum) => {
      return tick.value;
    });

    if (isNumber(ticksThreshold) && ticksThreshold < len) {
      // 对ticks进行采样
      const page = Math.ceil(len / ticksThreshold!);
      ticksCopy = ticksCopy.filter((tick: TickDatum, idx: number) => idx % page === 0);
    }

    // 完善字段
    return ticksCopy.map((datum, idx) => {
      const { value, text = undefined, state = 'default', id = String(idx) } = datum;
      return {
        id,
        value,
        state,
        text: text === undefined ? String(value) : text,
      } as Required<TickDatum>;
    });
  }

  /**
   * 计算刻度起始位置
   */
  private calcTick(value: number, len: number, offset: number): [Point, Point] {
    const [s1, s2] = this.getValuePoint(value);
    const v = this.getVerticalVector(value);
    const [v1, v2] = vec2.scale([0, 0], v, len);
    // 偏移量
    const [o1, o2] = vec2.scale([0, 0], v, offset);
    return [
      [s1 + o1, s2 + o2],
      [s1 + v1 + o1, s2 + v2 + o2],
    ];
  }

  /**
   * 获得绘制刻度线的属性
   */
  private getTicksCfg(): ITicksCfg {
    const { tickLine, subTickLine, label } = this.attributes;
    const style = {
      tickLines: [],
      subTickLines: [],
      labels: [],
      // labelsCfg: label,
    } as ITicksCfg;
    const ticks = this.getTicksData();
    // 不绘制刻度
    if (!tickLine) {
      return style;
    }

    const { length, offset, appendTick } = tickLine as Required<AxisTickLineCfg>;
    if (appendTick) {
      const { value, state, id } = ticks[ticks.length - 1];
      if (value !== 1) {
        ticks.push({
          value: 1,
          text: ' ',
          state,
          id: String(Number(id) + 1),
        });
      }
    }
    const isCreateSubTickLines = subTickLine && (subTickLine as Required<AxisSubTickLineCfg>).count >= 0;

    ticks.forEach((tick: TickDatum, idx: number) => {
      const nextTickValue = idx === ticks.length - 1 ? 1 : ticks[idx + 1].value;
      const { value: currTickValue } = tick;
      const [st, end] = this.calcTick(currTickValue, length, offset);
      style.tickLines.push({
        path: [
          ['M', ...st],
          ['L', ...end],
        ],
        ...this.getStyle(['tickLine', 'style']),
      });
      if (label) {
        const {
          formatter,
          alignTick,
          // TODO 暂时只支持平行于刻度方向的偏移量
          offset: [, o2],
        } = label as Required<AxisLabelCfg>;
        const labelVal = alignTick ? currTickValue : (currTickValue + nextTickValue) / 2;
        const [st] = this.calcTick(labelVal, length, o2);
        const formattedText = formatter(tick);
        style.labels.push({
          x: st[0],
          y: st[1],
          value: labelVal,
          text: formattedText,
          rawText: formattedText, // 缩略时保留原始文本
          ...this.getStyle(['label', 'style']),
        });
      }
      // 子刻度属性
      if (isCreateSubTickLines && idx >= 0 && currTickValue < 1) {
        // 子刻度只在两个刻度之间绘制
        const { count, length, offset } = subTickLine as Required<AxisSubTickLineCfg>;
        const subStep = (nextTickValue - currTickValue) / (count + 1);
        for (let i = 1; i <= count; i += 1) {
          const [st, end] = this.calcTick(currTickValue + i * subStep, length, offset);
          style.subTickLines.push({
            path: [
              ['M', ...st],
              ['L', ...end],
            ],
            ...this.getStyle(['subTickLine', 'style']),
          });
        }
      }
    });
    return style;
  }

  /**
   * 创建刻度线、子刻度线和label
   */
  private updateTicksShape() {
    this.tickLinesGroup.removeChildren(true);
    this.subTickLinesGroup.removeChildren(true);
    this.labelsGroup.removeChildren(true);

    const { tickLines, labels, subTickLines } = this.getTicksCfg();
    // 刻度
    tickLines.forEach((style, idx) => {
      this.tickLinesGroup.appendChild(
        new Path({
          name: 'tickLine',
          style: {
            identity: idx,
            ...style,
          },
        })
      );
    });
    // label
    labels.forEach(({ ...style }) => {
      this.labelsGroup.appendChild(
        new Text({
          name: 'label',
          style,
        })
      );
    });

    // 子刻度
    subTickLines.forEach((style) => {
      this.subTickLinesGroup.appendChild(
        new Path({
          name: 'subTickLine',
          style,
        })
      );
    });

    this.adjustLabels();
  }

  private getLabels(): Text[] {
    return this.labelsGroup.children;
  }

  /**
   * 获得 label 配置项
   * 前提是确保 label 不为false
   */
  private getLabelsCfg() {
    const { label } = this.attributes;
    return label as Required<AxisLabelCfg>;
  }

  /** ------------------------------label 调整------------------------------------------ */

  /**
   * 对label应用各种策略
   * 设置 label 的状态
   * 旋转成功则返回对应度数
   */
  private adjustLabels(): void {
    const { label } = this.attributes;
    if (!label) return;
    const {
      rotate,
      overlapOrder = [],
      autoEllipsis,
      autoHide,
      autoRotate,
    } = label as Pick<AxisLabelCfg, 'rotate' | 'overlapOrder' | 'autoEllipsis' | 'autoHide' | 'autoRotate'>;
    if (typeof rotate === 'number') this.setLabelEulerAngles(rotate);

    const doNothing = () => {};
    const autoMap: {
      [key in OverlapType]: Function;
    } = {
      autoHide: autoHide ? this.autoHideLabel : doNothing,
      autoEllipsis: autoEllipsis ? this.autoEllipsisLabel : doNothing,
      autoRotate: autoRotate ? this.autoRotateLabel : doNothing,
    };
    overlapOrder.forEach((item) => {
      autoMap[item].call(this);
    });
  }

  /** ------------------------------自动旋转相关------------------------------------------ */

  /**
   * 判断标签是否发生碰撞
   */
  private isLabelsOverlap() {
    const { margin } = this.getLabelsCfg();
    return isLabelsOverlap(this.getLabels(), margin);
  }

  /**
   * 自动旋转
   * 返回最终旋转的角度
   */
  private autoRotateLabel(): number {
    const {
      rotate,
      rotateRange: [min, max],
      rotateStep: step,
    } = this.getLabelsCfg();
    if (rotate !== undefined) {
      return rotate;
    }
    const prevAngles = this.getLabelEulerAngles();
    for (let angle = min; angle < max; angle += step) {
      this.setLabelEulerAngles(angle);
      // 判断 label 是否发生碰撞
      if (!this.isLabelsOverlap()) {
        return angle;
      }
    }
    // 未能通过旋转避免重叠
    // 重置rotate
    this.setLabelEulerAngles(prevAngles);
    return prevAngles;
  }

  /** ------------------------------自动隐藏相关------------------------------------------ */

  /**
   * 自动隐藏
   */
  private autoHideLabel() {
    const { margin, autoHideTickLine } = this.getLabelsCfg();
    const labels = this.getLabels();
    //  确定采样频率
    let seq = 1;

    while (seq < labels.length - 2) {
      if (
        !isLabelsOverlap(
          // eslint-disable-next-line no-loop-func
          labels.filter((label, idx) => {
            if (idx % seq === 0) {
              return true;
            }
            return false;
          }),
          margin
        )
      ) {
        break;
      }
      seq += 1;
    }
    // 根据seq进行hide show
    labels.forEach((label, idx) => {
      if (idx === 0 || idx === labels.length || idx % seq === 0) {
        label.show();
        this.getTickLineShape(idx).show();
      } else {
        label.hide();
        if (autoHideTickLine) this.getTickLineShape(idx).hide();
      }
    });
  }

  /** ------------------------------自动缩略相关------------------------------------------ */
  /**
   * 获取 缩短、缩写 label 的策略
   * @param text {String} 当前要缩略的label
   * @param width {number} 限制的宽度
   * @param idx {number} label 索引
   */
  public getLabelEllipsisStrategy(width: number) {
    const { type } = this.getLabelsCfg();
    if (type === 'text') {
      const font = this.getLabelFont();
      return (...args: [string, number]) => getEllipsisText(args[0], width, font);
    }
    if (type === 'number') {
      return this.getNumberSimplifyStrategy(width);
    }
    if (type === 'time') {
      // 时间缩略
      return this.getTimeSimplifyStrategy(width);
    }
    // 默认策略，不做任何处理
    return (...args: [string, number]) => args[0];
  }

  /**
   * 取在label属性
   */
  private getLabelFont() {
    return pick(
      this.getLabels()[0]?.attr(),
      ['fontSize', 'fontFamily', 'fontWeight', 'fontStyle', 'fontVariant'] || []
    );
  }

  /**
   * 获得文本以label字体下的宽度
   */
  private getTextWidthByLabelFont(text: string) {
    return measureTextWidth(text, this.getLabelFont());
  }

  /**
   * 宽度为 width 时采取何种数字缩写缩略
   */
  private getNumberSimplifyStrategy(width: number) {
    // 确定最长的数字使用的计数方法
    // 其余数字都采用该方法
    const { labels } = this.getTicksCfg();
    const num = Number(maxBy(labels, ({ text }) => text.length).text);
    const font = this.getLabelFont();
    /**
     * 输入： 100000000， 宽度x
     * 1. 原始数值    100,000,000
     * 2. K表达      100,000K
     * 3. 科学计数    1e+8
     */
    let result = toThousands(num);
    if (measureTextWidth(result, font) <= width) {
      return (...args: [string, number]) => toThousands(Number(args[0]));
    }
    result = toKNotation(num);
    if (measureTextWidth(result, font) <= width) {
      return (...args: [string, number]) => toKNotation(Number(args[0]), 1);
    }
    // 如果都不行，只能用科学计数法了
    return (...args: [string, number]) => toScientificNotation(Number(args[0]));
  }

  /**
   * 时间缩略
   */
  private getTimeSimplifyStrategy(width: number) {
    const ticks = this.getTicksData();
    const { text: startTime } = minBy(ticks, ({ text }) => new Date(text).getTime());
    const { text: endTime } = maxBy(ticks, ({ text }) => new Date(text).getTime());
    const scale = getTimeScale(startTime, endTime);
    /**
     * 以下定义了时间显示的规则
     * keyTimeMap 为关键节点的时间显示，第一个时间、每scale时间，关键节点不受width限制，但最小单位与非关键节点一致
     * 例如2021-01-01 - 2022-12-31 中的关键时间节点为2021-01-01, 2022-01-01
     * commonTimeMap 为非关键节点的显示，在空间充足的情况下会优先显示信息更多(靠前)的选项
     * 如在空间充足的情况下，2021-01-01 - 2022-12-31 会显示为：2021-01-01 2021-01-02 ... 形势
     * 空间略微不足时：2021-01-01 01-02 01-03 ... 2022-01-01 01-02 ...
     * 空间较为不足时：2021-01 02 ... 2022-01 02 ...
     */

    const baseTime = new Date('1970-01-01 00:00:00');
    const font = this.getLabelFont();

    /**
     * 非关键节点mask
     */
    let commonTimeMask!: [TimeScale, TimeScale];
    for (let idx = 0; idx < COMMON_TIME_MAP[scale].length; idx += 1) {
      const scheme = COMMON_TIME_MAP[scale][idx] as [TimeScale, TimeScale];
      if (measureTextWidth(formatTime(baseTime, getMask(scheme)), font) < width) {
        commonTimeMask = scheme;
        break;
      }
      // 最后一个是备选方案
      commonTimeMask = scheme;
    }

    let keyTimeMask: [TimeScale, TimeScale];
    // 选择关键节点mask
    const [, minUnit] = commonTimeMask;
    for (let idx = 0; idx < timeScale.length; idx += 1) {
      if (timeScale.indexOf(minUnit) >= idx) {
        const scheme = [timeScale[0], minUnit] as [TimeScale, TimeScale];
        if (measureTextWidth(formatTime(baseTime, getMask(scheme)), font) < width) {
          keyTimeMask = scheme;
          break;
        }
        keyTimeMask = scheme;
      }
    }

    return (...args: [string, number]) => {
      const text = args[0];
      const idx = args[1];
      let prevText = text;
      if (idx !== 0) prevText = ticks[idx - 1].text;
      let mask = commonTimeMask;
      if (idx === 0 || getTimeStart(new Date(prevText), scale) !== getTimeStart(new Date(text), scale))
        mask = keyTimeMask;
      return formatTime(new Date(text), getMask(mask));
    };
  }

  /**
   * 对label应用各种策略
   * 设置 label 的状态
   * 旋转成功则返回对应度数
   */

  /**
   * 缩略 labels 到指定长度内
   */
  private labelsEllipsis(width: number) {
    const strategy = this.getLabelEllipsisStrategy(width);
    this.getLabels().forEach((label, idx) => {
      const rawText = label.attr('rawText');
      label.attr('text', strategy.call(this, rawText, idx));
    });
  }

  private parseLength(length: string | number) {
    return isString(length) ? this.getTextWidthByLabelFont(length) : length;
  }

  private autoEllipsisLabel() {
    const { ellipsisStep, minLength, maxLength, margin } = this.getLabelsCfg();
    const labels = this.getLabels();
    const step = this.parseLength(ellipsisStep);
    const max = this.parseLength(maxLength);
    // 不限制长度
    if (max === Infinity) return Infinity;
    const min = this.parseLength(minLength);
    for (let allowedLength = max; allowedLength > min; allowedLength -= step) {
      // 缩短文本
      this.labelsEllipsis(allowedLength);
      // 碰撞检测
      if (!isLabelsOverlap(labels, margin)) {
        return allowedLength;
      }
    }
    // 缩短失败，使用minLength作为最终长度
    return min;
  }
}