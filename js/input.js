export function wireInput(canvas, stage, events) {
  let pointer = null;
  let part = null;

  canvas.addEventListener('pointerdown', (event) => {
    if (!events.enabled() || pointer !== null || event.button !== 0) return;
    const position = stage.point(event.clientX, event.clientY);
    part = stage.hit(position.x, position.y, event.pointerType !== 'mouse');
    if (!part) return;
    pointer = event.pointerId;
    canvas.setPointerCapture(pointer);
    part.grab(position.x, position.y);
    events.grab(part);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointer || !part) return;
    const p = stage.point(event.clientX, event.clientY);
    part.drag(p.x, p.y);
  });
  function finish(event, cancelled) {
    if (event.pointerId !== pointer || !part) return;
    const active = part;
    const id = pointer;
    pointer = null;
    part = null;
    const peak = active.release();
    if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    events.release(active, peak, cancelled);
  }
  canvas.addEventListener('pointerup', (event) => finish(event, false));
  canvas.addEventListener('pointercancel', (event) => finish(event, true));
  canvas.addEventListener('lostpointercapture', (event) => finish(event, true));
  return () => {
    if (!part) return;
    const active = part;
    const id = pointer;
    part = null;
    pointer = null;
    active.release();
    if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  };
}
