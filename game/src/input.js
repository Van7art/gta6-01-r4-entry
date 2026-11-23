// Input — keyboard + mouse state, weapon wheel, and edge-triggered presses.
// The game loop reads held keys; actions read the pressed set, cleared each frame.
export function makeInput() {
  return {
    keys: new Set(),
    pressed: new Set(),
    mouseX: 640,
    mouseY: 360,
    mouseDown: false,
    mousePressed: false,
    wheelOpen: false,
    wheelChoice: null,
  };
}

const KEY_ACTIONS = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'run', ShiftRight: 'run',
  Space: 'handbrake',
};

export function inputState(input) {
  return {
    up: input.keys.has('KeyW') || input.keys.has('ArrowUp'),
    down: input.keys.has('KeyS') || input.keys.has('ArrowDown'),
    left: input.keys.has('KeyA') || input.keys.has('ArrowLeft'),
    right: input.keys.has('KeyD') || input.keys.has('ArrowRight'),
    run: input.keys.has('ShiftLeft') || input.keys.has('ShiftRight'),
    handbrake: input.keys.has('Space'),
  };
}

export function wasPressed(input, code) {
  return input.pressed.has(code);
}

export function clearPressed(input) {
  input.pressed.clear();
  input.mousePressed = false;
}

export function attachInput(input, canvas) {
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!e.repeat) input.pressed.add(e.code);
    input.keys.add(e.code);
    if (e.code === 'KeyQ') input.wheelOpen = true;
  });
  window.addEventListener('keyup', (e) => {
    input.keys.delete(e.code);
    if (e.code === 'KeyQ') input.wheelOpen = false;
  });
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    input.mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) { input.mouseDown = true; input.mousePressed = true; }
  });
  window.addEventListener('mouseup', () => { input.mouseDown = false; });
  window.addEventListener('blur', () => { input.keys.clear(); input.mouseDown = false; });
  return input;
}

export { KEY_ACTIONS };
