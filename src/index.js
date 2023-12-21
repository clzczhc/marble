import Matter from "matter-js";
import 'pathseg';
import MatterAttractors from 'matter-attractors';

let engine;

const PATHS = {
  leftArrow: 'M 0 0 L 40 60 L 0 100 L 0 0',
  // 最高的那个点要作为出发点（不知道具体原因）
  rightArrow: 'M 40 -60 L 40 40 L 0 0 L 40 -60',
  leftBottom: 'M 0 0 L 0 -140 L 180 0 L 0 0',
  rightBottom: 'M 0 -140 L 0 0 L -180 0 L 0 -140'
};

const WIDTH = 500;
const HEIGHT = 640;

const group = Matter.Body.nextGroup(true);

function init() {
  Matter.Common.setDecomp(require('poly-decomp'));
  Matter.use(MatterAttractors);

  engine = Matter.Engine.create();

  const render = Matter.Render.create({
    element: document.querySelector(".container"),
    engine: engine,
    options: {
      width: WIDTH,
      height: HEIGHT,
      wireframes: false,
    },
  });
  Matter.Render.run(render);

  const runner = Matter.Runner.create();
  Matter.Runner.run(runner, engine);

  const mouse = Matter.Mouse.create(render.canvas);
  const mouseConstraint = Matter.MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
      stiffness: 0.2,
      render: {
        visible: false
      }
    }
  });

  Matter.Composite.add(engine.world, mouseConstraint);
}

function addBoundries() {
  svg(236, 80, "dome");

  Matter.Composite.add(engine.world, [
    boundary(0, HEIGHT / 2, 40, HEIGHT),
    boundary(WIDTH, HEIGHT / 2, 40, HEIGHT),
    boundary(WIDTH / 2, HEIGHT, HEIGHT, 40),

    wall(150, 100, 18, 40),
    wall(230, 100, 18, 40),
    wall(320, 100, 18, 40),

    circle(100, 180, 20),
    circle(225, 180, 20),
    circle(350, 180, 20),

    circle(160, 260, 20),
    circle(290, 260, 20),

    wall(440, 420, 20, 450),

    wall(120, 380, 20, 110),
    wall(320, 380, 20, 110),

    wall(60, 400, 20, 150),
    wall(88, 485, 20, 88, {
      angle: -0.95,
    }),

    wall(380, 400, 20, 150),
    wall(352, 485, 20, 88, {
      angle: 0.95,
    }),

    reset(225, 64),
    reset(465, 32),

    path(35, 260, PATHS.leftArrow),
    path(416, 280, PATHS.rightArrow),

    path(80, 580, PATHS.leftBottom),
    path(370, 580, PATHS.rightBottom),
  ]);
}

let isLeftPaddleUp = false;
let isRightPaddleUp = false;
function addEvents() {
  window.addEventListener('keypress', (e) => {
    if (e.key.toLowerCase() === 'a') {
      isLeftPaddleUp = true;
    } else {
      isLeftPaddleUp = false;
    }

    if (e.key.toLowerCase() === 'd') {
      isRightPaddleUp = true;
    } else {
      isRightPaddleUp = false;
    }
  })

  window.addEventListener('keyup', (e) => {
    if (e.key.toLowerCase() === 'a') {
      isLeftPaddleUp = false;
    }

    if (e.key.toLowerCase() === 'd') {
      isRightPaddleUp = false;
    }
  })

  Matter.Events.on(engine, 'collisionStart', (e) => {
    e.pairs.forEach(function (pair) {
      const bodyA = pair.bodyA;
      const bodyB = pair.bodyB;

      if (bodyA.label === 'reset') {
        Matter.Composite.remove(engine.world, [bodyB]);
        addMarble();
      }

      if (bodyB.label === 'reset') {
        Matter.Composite.remove(engine.world, [bodyA]);
        addMarble();
      }
    })
  });
}

function getPaddleStatus(side) {
  const isPaddleUp = side === 'left' ? isLeftPaddleUp : isRightPaddleUp;
  return isPaddleUp;
}

function stopper(x, y, side, position) {
  const judgeLabel = side === 'left' ? 'paddleLeftComp' : 'paddleRightComp';


  const options = {
    isStatic: true,
    render: {
      fillStyle: 'red',
      visible: false
    },
    collisionFilter: {
      group: group,
    },
    plugin: {
      attractors: [
        function (bodyA, bodyB) {
          if (bodyB.label === judgeLabel) {
            return {
              x: (bodyA.position.x - bodyB.position.x) * 0.002 * ((getPaddleStatus(side)) ? -1 : 0.5),  // 0.5是防止松手后，吸引力太大导致变形
              y: (bodyA.position.y - bodyB.position.y) * 0.002 * ((getPaddleStatus(side)) ? -1 : 0.5)
            }
          }
        }
      ]
    }
  };

  const hadForce = position === 'bottom';
  if (!hadForce) {
    // 只有下面的stopper有引（斥）力
    Reflect.deleteProperty(options, 'plugin');
  }

  return Matter.Bodies.circle(x, y, 20, options);
}

function addPaddles() {
  const stoperLeftTop = stopper(170, 460, 'left', 'top');
  const stoperLeftBottom = stopper(136, 580, 'left', 'bottom');
  const stoperRightTop = stopper(280, 460, 'right', 'top');
  const stoperRightBottom = stopper(300, 580, 'right', 'bottom');

  Matter.Composite.add(engine.world, [
    stoperLeftTop,
    stoperLeftBottom,
    stoperRightTop,
    stoperRightBottom
  ]);

  const paddleLeft = {};
  paddleLeft.paddle = Matter.Bodies.trapezoid(134, 512, 20, 88, 0.33, {
    label: 'paddleLeft',
    angle: 1.57,
    chamfer: {},
    render: {
      fillStyle: 'skyblue'
    }
  });

  paddleLeft.brick = Matter.Bodies.rectangle(134, 524, 40, 40, {
    render: {
      fillStyle: 'blue',
      visible: false
    },
  });

  // 将两个物块组装在一起
  paddleLeft.comp = Matter.Body.create({
    label: 'paddleLeftComp',
    parts: [paddleLeft.paddle, paddleLeft.brick]
  });

  // bodyB表示给paddleLeft.comp添加约束，pointB则是相对paddleLeft.comp的坐标
  // pointA是这个物理世界的坐标
  const constraintLeft = Matter.Constraint.create({
    bodyB: paddleLeft.comp,
    pointB: {
      x: -32,
      y: -8
    },
    pointA: {
      x: paddleLeft.comp.position.x,
      y: paddleLeft.comp.position.y,
    },
    stiffness: 0.9,
    length: 0,
    render: {
      strokeStyle: 'pink'
    }
  });
  Matter.Composite.add(engine.world, constraintLeft);

  const paddleRight = {};
  paddleRight.paddle = Matter.Bodies.trapezoid(304, 512, 20, 88, 0.33, {
    // isStatic: true,
    label: 'paddleRight',
    angle: -1.57,
    chamfer: {},
    render: {
      fillStyle: 'skyblue'
    }
  });

  paddleRight.brick = Matter.Bodies.rectangle(304, 524, 40, 40, {
    render: {
      fillStyle: 'blue',
      visible: false
    }
  });

  paddleRight.comp = Matter.Body.create({
    label: 'paddleRightComp',
    parts: [paddleRight.paddle, paddleRight.brick]
  });

  const constraintRight = Matter.Constraint.create({
    bodyB: paddleRight.comp,
    pointB: {
      x: 32,
      y: -8
    },
    pointA: {
      x: paddleRight.comp.position.x,
      y: paddleRight.comp.position.y,
    },
    stiffness: 0.9,
    length: 0,
    render: {
      strokeStyle: 'pink'
    }
  });
  Matter.Composite.add(engine.world, constraintRight);

  Matter.Composite.add(engine.world, [
    paddleLeft.comp,
    paddleRight.comp
  ]);
}

function addMarble() {
  const marble = Matter.Bodies.circle(0, 0, 10, {
    render: {
      fillStyle: 'green'
    },
    collisionFilter: {
      group: group
    }
  });
  Matter.Composite.add(engine.world, marble);

  // 设置坐标
  Matter.Body.setPosition(marble, {
    x: 464,
    y: 500,
  });

  // 设置力
  Matter.Body.setVelocity(marble, {
    x: 0,
    y: -22,
  });
}

function boundary(x, y, width, height) {
  return Matter.Bodies.rectangle(x, y, width, height, {
    isStatic: true,
    render: {
      fillStyle: "#495057",
    },
  });
}

function circle(x, y, radius) {
  const circle = Matter.Bodies.circle(x, y, radius, {
    isStatic: true,
    render: {
      fillStyle: "#495057",
    },
  });

  // 直接在初始化那里加不会生效
  circle.restitution = 1.5;

  return circle;
}

function wall(x, y, width, height, options) {
  return Matter.Bodies.rectangle(x, y, width, height, {
    isStatic: true,
    angle: options && options.angle ? options.angle : 0,
    chamfer: {
      radius: 10,
    },
    render: {
      fillStyle: "#495057",
    },
  });
}

function reset(x, width) {
  return Matter.Bodies.rectangle(x, 620, width, 2, {
    label: "reset",
    isStatic: true,
    render: {
      fillStyle: "#fff",
    },
  });
}

function path(x, y, path) {
  const vertices = Matter.Vertices.fromPath(path);

  return Matter.Bodies.fromVertices(x, y, vertices, {
    isStatic: true,
    render: {
      fillStyle: "pink",
      strokeStyle: "pink",
      lineWidth: 1,
    },
  });
}

const loadSvg = function (url) {
  return fetch(url)
    .then(function (response) {
      return response.text();
    })
    .then(function (raw) {
      // 把加载的svg转成document对象
      return (new window.DOMParser()).parseFromString(raw, 'image/svg+xml');
    });
};

function svg(x, y, svgName) {
  loadSvg(`/svg/${svgName}.svg`)
    .then((root) => {
      console.log(root);

      const vertices = [...root.querySelectorAll('path')].map(path => {
        return Matter.Svg.pathToVertices(path, 36);
      });

      Matter.Composite.add(engine.world, Matter.Bodies.fromVertices(x, y, vertices, {
        isStatic: true,
        render: {
          fillStyle: '#495057',
          lineWidth: 1
        }
      }));
    })
}

function load() {
  init();
  addBoundries();
  addEvents();
  addPaddles();
  addMarble();
}

load();
