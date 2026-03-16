// Mobile toolbar for ttyd terminals — injected inline into ttyd HTML
// Provides touch-friendly arrow keys, modifier keys (Ctrl, Alt, Esc, Tab)
// Ctrl/Alt show a letter picker overlay instead of trying to intercept
// the iOS soft keyboard (which doesn't fire reliable keydown events).
module.exports = `
(function() {
  if (!('ontouchstart' in window) && !navigator.maxTouchPoints) return;

  var style = document.createElement('style');
  style.textContent =
    '#mt{position:fixed;bottom:0;left:0;right:0;display:flex;justify-content:center;' +
    'gap:4px;padding:6px 8px;padding-bottom:max(6px,env(safe-area-inset-bottom));' +
    'background:rgba(30,30,30,0.95);backdrop-filter:blur(8px);z-index:9999;flex-wrap:wrap}' +
    '#mt button{min-width:36px;height:36px;border:1px solid rgba(255,255,255,0.15);' +
    'border-radius:6px;background:rgba(255,255,255,0.08);color:#e0e0e0;font-size:14px;' +
    'font-family:monospace;cursor:pointer;display:flex;align-items:center;justify-content:center;' +
    'padding:0 8px;-webkit-tap-highlight-color:transparent;user-select:none}' +
    '#mt button:active{background:rgba(255,255,255,0.2)}' +
    '#mt button.on{background:rgba(189,183,252,0.3);border-color:rgba(189,183,252,0.5);color:#bdb7fc}' +
    '#mt .sp{width:8px}' +
    '#mt-picker{position:fixed;bottom:52px;left:0;right:0;display:none;justify-content:center;' +
    'flex-wrap:wrap;gap:4px;padding:8px 12px;padding-bottom:max(8px,env(safe-area-inset-bottom));' +
    'background:rgba(20,20,20,0.97);backdrop-filter:blur(8px);z-index:9998;' +
    'border-top:1px solid rgba(255,255,255,0.1)}' +
    '#mt-picker.show{display:flex}' +
    '#mt-picker button{min-width:32px;height:32px;border:1px solid rgba(255,255,255,0.12);' +
    'border-radius:6px;background:rgba(255,255,255,0.06);color:#e0e0e0;font-size:13px;' +
    'font-family:monospace;cursor:pointer;display:flex;align-items:center;justify-content:center;' +
    'padding:0 6px;-webkit-tap-highlight-color:transparent;user-select:none}' +
    '#mt-picker button:active{background:rgba(189,183,252,0.3)}' +
    '#mt-picker .lbl{width:100%;text-align:center;font-size:11px;color:rgba(255,255,255,0.4);' +
    'margin-bottom:2px;font-family:monospace}' +
    'body{padding-bottom:48px!important}';
  document.head.appendChild(style);

  var pickerMode = null; // 'ctrl' or 'alt'
  function ta() { return document.querySelector('.xterm-helper-textarea'); }

  function send(key, code, kc, extra) {
    var t = ta(); if (!t) return; t.focus();
    var o = {key:key, code:code||'', keyCode:kc||0, which:kc||0,
      ctrlKey: !!(extra && extra.ctrl),
      altKey: !!(extra && extra.alt),
      shiftKey:false, metaKey:false, bubbles:true, cancelable:true};
    t.dispatchEvent(new KeyboardEvent('keydown', o));
    t.dispatchEvent(new KeyboardEvent('keyup', o));
  }

  function showPicker(mode) {
    if (pickerMode === mode) { hidePicker(); return; }
    pickerMode = mode;
    picker.className = 'show';
    lbl.textContent = mode === 'ctrl' ? 'Ctrl + ...' : 'Alt + ...';
    updBtn();
  }

  function hidePicker() {
    pickerMode = null;
    picker.className = '';
    updBtn();
  }

  function updBtn() {
    var c = document.getElementById('mt-c');
    var a = document.getElementById('mt-a');
    if (c) c.className = pickerMode === 'ctrl' ? 'on' : '';
    if (a) c && (a.className = pickerMode === 'alt' ? 'on' : '');
  }

  function onPickerKey(ch) {
    var extra = {};
    if (pickerMode === 'ctrl') extra.ctrl = true;
    if (pickerMode === 'alt') extra.alt = true;
    var code = 'Key' + ch.toUpperCase();
    var kc = ch.toUpperCase().charCodeAt(0);
    send(ch, code, kc, extra);
    hidePicker();
  }

  // Build the letter picker
  var picker = document.createElement('div');
  picker.id = 'mt-picker';
  var lbl = document.createElement('div');
  lbl.className = 'lbl';
  picker.appendChild(lbl);

  'abcdefghijklmnopqrstuvwxyz'.split('').forEach(function(ch) {
    var b = document.createElement('button');
    b.textContent = ch;
    b.addEventListener('touchstart', function(e){e.preventDefault();onPickerKey(ch);}, {passive:false});
    b.addEventListener('mousedown', function(e){e.preventDefault();onPickerKey(ch);});
    picker.appendChild(b);
  });

  // Build the main toolbar
  var bar = document.createElement('div');
  bar.id = 'mt';

  var keys = [
    ['Esc', function(){send('Escape','Escape',27)}],
    ['Tab', function(){send('Tab','Tab',9)}],
    ['Ctrl', function(){showPicker('ctrl')}, 'mt-c'],
    ['Alt', function(){showPicker('alt')}, 'mt-a'],
    null,
    ['\\u2191', function(){send('ArrowUp','ArrowUp',38)}],
    ['\\u2193', function(){send('ArrowDown','ArrowDown',40)}],
    ['\\u2190', function(){send('ArrowLeft','ArrowLeft',37)}],
    ['\\u2192', function(){send('ArrowRight','ArrowRight',39)}],
  ];

  keys.forEach(function(k) {
    if (!k) { var s=document.createElement('div');s.className='sp';bar.appendChild(s);return; }
    var b = document.createElement('button');
    b.textContent = k[0];
    if (k[2]) b.id = k[2];
    b.addEventListener('touchstart', function(e){e.preventDefault();k[1]();}, {passive:false});
    b.addEventListener('mousedown', function(e){e.preventDefault();k[1]();});
    bar.appendChild(b);
  });

  document.body.appendChild(picker);
  document.body.appendChild(bar);
})();
`;
