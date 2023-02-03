import { Group, Image, Text } from '@antv/g';
import { axisWarper } from '../../utils';

export const AxisLinearTitle = () => {
  const group = new Group({
    style: {
      width: 900,
      height: 500,
    },
  });

  const createAxis = axisWarper(group, {
    type: 'linear',
    data: new Array(10).fill(0).map((_, i, arr) => ({ value: i / (arr.length - 1), label: '' })),
    lineLineWidth: 5,
    tickLineWidth: 5,
    title: 'title',
    titleFill: 'red',
    titleFontSize: 20,
    titleFontWeight: 'bold',
    labelFormatter: () => '',
  });

  createAxis({ startPos: [50, 50], endPos: [500, 50], titleTransform: 'translate(100%, 0)' });
  createAxis({ startPos: [50, 100], endPos: [500, 100], titlePosition: 'b' });
  createAxis({ startPos: [50, 150], endPos: [500, 150], titlePosition: 'rb', titleTransform: 'translate(-100%, 0)' });
  createAxis({ startPos: [500, 300], endPos: [50, 300], titlePosition: 'lt', titleTransform: 'translate(100%, 0)' });
  createAxis({ startPos: [500, 350], endPos: [50, 350], titlePosition: 't' });
  createAxis({ startPos: [500, 400], endPos: [50, 400], titlePosition: 'rt', titleTransform: 'translate(-100%, 0)' });

  createAxis({ startPos: [600, 50], endPos: [600, 450], titlePosition: 'lt', titleTransform: 'translate(0, 100%)' });
  createAxis({ startPos: [650, 50], endPos: [650, 450], titlePosition: 'l' });
  createAxis({ startPos: [700, 50], endPos: [700, 450], titlePosition: 'lb', titleTransform: 'translate(0, -100%)' });
  createAxis({ startPos: [750, 50], endPos: [750, 450], titlePosition: 'rt', titleTransform: 'translate(0, 100%)' });
  createAxis({ startPos: [800, 450], endPos: [800, 50], titlePosition: 'r' });
  createAxis({ startPos: [850, 450], endPos: [850, 50], titlePosition: 'rb', titleTransform: 'translate(0, -100%)' });

  const title = new Group();
  title.appendChild(
    new Image({
      style: {
        src: 'https://gw.alipayobjects.com/mdn/rms_6ae20b/afts/img/A*N4ZMS7gHsUIAAAAAAAAAAABkARQnAQ',
        height: 30,
        width: 30,
        anchor: '0 0',
      },
    })
  );
  title.appendChild(
    new Text({
      style: {
        x: 80,
        y: 15,
        text: "I'm title",
        textBaseline: 'middle',
        textAlign: 'start',
      },
    })
  );

  createAxis({
    startPos: [500, 500],
    endPos: [50, 500],
    title,
    titlePosition: 'lt',
    titleTransform: 'translate(50%, -50%)',
  });

  return group;
};