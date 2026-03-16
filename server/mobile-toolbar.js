// Mobile toolbar for ttyd terminals — injected inline into ttyd HTML
// 1. Transparent text overlay (PDF.js-style) for native iOS text selection
//    - Intercepts WebSocket to capture terminal output
//    - Minimal VT parser maintains a text buffer
//    - Renders as invisible selectable text on top of xterm canvas
// 2. Touch-friendly toolbar: arrow keys, Esc, Tab, Ctrl/Alt with QWERTY picker
module.exports = `
(function() {
  if (!('ontouchstart' in window) && !navigator.maxTouchPoints) return;

  // ─── Text Overlay: WebSocket intercept + VT parser ───
  var OrigWS = window.WebSocket;
  var dec = new TextDecoder();
  var tC = 80, tR = 24, cR = 0, cC = 0;
  var buf = [], overlay = null, dirty = false;
  var vtS = 0, csiP = '';

  function ib() {
    buf = [];
    for (var r = 0; r < tR; r++) buf.push(Array(tC).fill(' '));
    cR = 0; cC = 0;
  }
  ib();

  function su() { buf.shift(); buf.push(Array(tC).fill(' ')); }

  function ex(cmd, p) {
    var a = p.split(';').map(function(x){return parseInt(x)||0;});
    switch(cmd) {
      case 'H': case 'f': cR=Math.max(0,(a[0]||1)-1); cC=Math.max(0,(a[1]||1)-1); break;
      case 'A': cR=Math.max(0,cR-(a[0]||1)); break;
      case 'B': cR=Math.min(tR-1,cR+(a[0]||1)); break;
      case 'C': cC=Math.min(tC-1,cC+(a[0]||1)); break;
      case 'D': cC=Math.max(0,cC-(a[0]||1)); break;
      case 'G': cC=Math.max(0,(a[0]||1)-1); break;
      case 'd': cR=Math.max(0,(a[0]||1)-1); break;
      case 'J':
        if(a[0]===2||a[0]===3){ib();}
        else if(!a[0]){
          for(var c=cC;c<tC;c++)buf[cR][c]=' ';
          for(var r=cR+1;r<tR;r++)buf[r].fill(' ');
        } else if(a[0]===1){
          for(var c=0;c<=cC;c++)buf[cR][c]=' ';
          for(var r=0;r<cR;r++)buf[r].fill(' ');
        }
        break;
      case 'K':
        if(a[0]===2)buf[cR].fill(' ');
        else if(!a[0]){for(var c=cC;c<tC;c++)buf[cR][c]=' ';}
        else if(a[0]===1){for(var c=0;c<=cC;c++)buf[cR][c]=' ';}
        break;
      case 'X':
        var n=a[0]||1;
        for(var c=cC;c<Math.min(cC+n,tC);c++)buf[cR][c]=' ';
        break;
      case 'L':
        for(var i=0;i<(a[0]||1);i++){buf.splice(cR,0,Array(tC).fill(' '));buf.pop();}
        break;
      case 'M':
        for(var i=0;i<(a[0]||1);i++){buf.splice(cR,1);buf.push(Array(tC).fill(' '));}
        break;
      case 'S': for(var i=0;i<(a[0]||1);i++)su(); break;
      case 'h': case 'l':
        if(p.indexOf('?')>=0&&(p.indexOf('1049')>=0||p.indexOf('47')>=0))ib();
        break;
    }
  }

  function feed(str) {
    for (var i = 0; i < str.length; i++) {
      var ch = str.charCodeAt(i);
      if (vtS===0) {
        if(ch===0x1b)vtS=1;
        else if(ch===13)cC=0;
        else if(ch===10){cR++;if(cR>=tR){su();cR=tR-1;}}
        else if(ch===8){if(cC>0)cC--;}
        else if(ch===9){cC=Math.min((Math.floor(cC/8)+1)*8,tC-1);}
        else if(ch>=32){
          if(cR>=0&&cR<tR&&cC<tC){
            buf[cR][cC]=str[i];cC++;
            if(cC>=tC){cC=0;cR++;if(cR>=tR){su();cR=tR-1;}}
          }
        }
      } else if(vtS===1){
        if(ch===0x5b){vtS=2;csiP='';} else if(ch===0x5d){vtS=3;} else vtS=0;
      } else if(vtS===2){
        if(ch>=0x30&&ch<=0x3f)csiP+=str[i];
        else if(ch>=0x20&&ch<=0x2f){}
        else{ex(str[i],csiP);vtS=0;}
      } else if(vtS===3){
        // OSC sequence — skip until ST (\\x1b\\\\ or \\x07)
        if(ch===7)vtS=0;
        else if(ch===0x1b)vtS=4;
      } else if(vtS===4){
        vtS=0; // ST terminator
      }
    }
    dirty = true;
  }

  // Monkey-patch WebSocket to intercept terminal output
  window.WebSocket = function(u, p) {
    var ws = p ? new OrigWS(u, p) : new OrigWS(u);
    ws.addEventListener('message', function(e) {
      try {
        if (e.data instanceof ArrayBuffer) {
          var v = new Uint8Array(e.data);
          if(v.length>1 && v[0]===0x30) feed(dec.decode(v.slice(1)));
        } else if(typeof e.data==='string' && e.data.length>1 && e.data[0]==='0') {
          feed(e.data.slice(1));
        }
      } catch(x){}
    });
    return ws;
  };
  window.WebSocket.prototype = OrigWS.prototype;
  window.WebSocket.CONNECTING = OrigWS.CONNECTING;
  window.WebSocket.OPEN = OrigWS.OPEN;
  window.WebSocket.CLOSING = OrigWS.CLOSING;
  window.WebSocket.CLOSED = OrigWS.CLOSED;

  function createOverlay() {
    var screen = document.querySelector('.xterm-screen');
    if (!screen || overlay) return;
    var measure = document.querySelector('.xterm-char-measure-element');
    var cellH = 18, fontSize = '14px';
    if (measure) {
      var mr = measure.getBoundingClientRect();
      if(mr.width>0&&mr.height>0) {
        cellH = mr.height;
        fontSize = getComputedStyle(measure).fontSize;
        var sr = screen.getBoundingClientRect();
        var nc = Math.floor(sr.width/mr.width);
        var nr = Math.floor(sr.height/mr.height);
        if(nc>0&&nr>0){tC=nc;tR=nr;ib();}
      }
    }
    overlay = document.createElement('div');
    overlay.id = 'mt-overlay';
    overlay.style.cssText =
      'position:absolute;top:0;left:0;right:0;bottom:0;z-index:100;' +
      'color:rgba(255,255,255,0.01);-webkit-user-select:text;user-select:text;' +
      '-webkit-touch-callout:default;touch-action:auto;' +
      'white-space:pre;overflow:hidden;font-family:monospace;cursor:text;' +
      'line-height:'+cellH+'px;font-size:'+fontSize+';padding:0;margin:0;';
    screen.style.position = 'relative';
    screen.appendChild(overlay);

    // Tap → focus terminal; long-press → native text selection
    var tapT = null;
    overlay.addEventListener('touchstart', function() {
      tapT = setTimeout(function(){tapT=null;}, 300);
    });
    overlay.addEventListener('touchend', function() {
      if(tapT){clearTimeout(tapT);tapT=null;var t=ta();if(t)t.focus();}
    });
    overlay.addEventListener('touchmove', function() {
      if(tapT){clearTimeout(tapT);tapT=null;}
    });

    (function render() {
      if(dirty && overlay) {
        overlay.textContent = buf.map(function(r){return r.join('');}).join('\\n');
        dirty = false;
      }
      requestAnimationFrame(render);
    })();
  }

  var oti = setInterval(function() {
    if(document.querySelector('.xterm-screen')){clearInterval(oti);createOverlay();}
  }, 200);

  window.addEventListener('resize', function() {
    if(!overlay) return;
    var m = document.querySelector('.xterm-char-measure-element');
    var s = document.querySelector('.xterm-screen');
    if(m&&s){
      var mr=m.getBoundingClientRect(), sr=s.getBoundingClientRect();
      if(mr.width>0&&mr.height>0){
        var nc=Math.floor(sr.width/mr.width), nr=Math.floor(sr.height/mr.height);
        if(nc>0&&nr>0&&(nc!==tC||nr!==tR)){tC=nc;tR=nr;ib();overlay.style.lineHeight=mr.height+'px';}
      }
    }
  });

  // ─── Mobile Toolbar ───
  var TOOLBAR_H = 48;
  var PICKER_H = 140;

  function applyPad(h) {
    document.body.style.height = 'calc(100vh - ' + h + 'px)';
    document.body.style.maxHeight = 'calc(100vh - ' + h + 'px)';
    document.body.style.overflow = 'hidden';
    var containers = document.querySelectorAll('#terminal-container, #terminal, .xterm');
    for (var i = 0; i < containers.length; i++) containers[i].style.height = '100%';
    setTimeout(function() { window.dispatchEvent(new Event('resize')); }, 50);
  }

  var style = document.createElement('style');
  style.textContent =
    'body{margin:0!important}' +
    '.xterm-screen canvas{pointer-events:none!important}' +
    '#mt-overlay{touch-action:auto!important;-webkit-user-select:text!important;user-select:text!important}' +
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
    '#mt-picker{position:fixed;bottom:' + TOOLBAR_H + 'px;left:0;right:0;display:none;' +
    'flex-direction:column;align-items:center;gap:4px;padding:8px 4px;' +
    'background:rgba(20,20,20,0.97);backdrop-filter:blur(8px);z-index:9998;' +
    'border-top:1px solid rgba(255,255,255,0.1)}' +
    '#mt-picker.show{display:flex}' +
    '#mt-picker .row{display:flex;justify-content:center;gap:3px}' +
    '#mt-picker button{min-width:30px;height:34px;border:1px solid rgba(255,255,255,0.12);' +
    'border-radius:6px;background:rgba(255,255,255,0.06);color:#e0e0e0;font-size:14px;' +
    'font-family:monospace;cursor:pointer;display:flex;align-items:center;justify-content:center;' +
    'padding:0 5px;-webkit-tap-highlight-color:transparent;user-select:none}' +
    '#mt-picker button:active{background:rgba(189,183,252,0.3)}' +
    '#mt-picker .lbl{text-align:center;font-size:11px;color:rgba(255,255,255,0.4);' +
    'margin-bottom:2px;font-family:monospace}';
  document.head.appendChild(style);

  var pickerMode = null;
  function ta() { return document.querySelector('.xterm-helper-textarea'); }

  function send(key, code, kc, extra) {
    var t = ta(); if (!t) return; t.focus();
    var o = {key:key, code:code||'', keyCode:kc||0, which:kc||0,
      ctrlKey: !!(extra && extra.ctrl), altKey: !!(extra && extra.alt),
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
    applyPad(TOOLBAR_H + PICKER_H);
  }

  function hidePicker() {
    pickerMode = null;
    picker.className = '';
    updBtn();
    applyPad(TOOLBAR_H);
  }

  function updBtn() {
    var c = document.getElementById('mt-c');
    var a = document.getElementById('mt-a');
    if (c) c.className = pickerMode === 'ctrl' ? 'on' : '';
    if (a) a.className = pickerMode === 'alt' ? 'on' : '';
  }

  function onPickerKey(ch) {
    var extra = {};
    if (pickerMode === 'ctrl') extra.ctrl = true;
    if (pickerMode === 'alt') extra.alt = true;
    send(ch, 'Key'+ch.toUpperCase(), ch.toUpperCase().charCodeAt(0), extra);
    hidePicker();
  }

  function makeKey(ch, parent) {
    var b = document.createElement('button');
    b.textContent = ch;
    b.addEventListener('touchstart', function(e){e.preventDefault();onPickerKey(ch);}, {passive:false});
    b.addEventListener('mousedown', function(e){e.preventDefault();onPickerKey(ch);});
    parent.appendChild(b);
  }

  var picker = document.createElement('div');
  picker.id = 'mt-picker';
  var lbl = document.createElement('div');
  lbl.className = 'lbl';
  picker.appendChild(lbl);

  ['qwertyuiop','asdfghjkl','zxcvbnm'].forEach(function(rowChars) {
    var row = document.createElement('div');
    row.className = 'row';
    rowChars.split('').forEach(function(ch) { makeKey(ch, row); });
    picker.appendChild(row);
  });

  var bar = document.createElement('div');
  bar.id = 'mt';

  [
    ['Esc', function(){send('Escape','Escape',27)}],
    ['Tab', function(){send('Tab','Tab',9)}],
    ['Ctrl', function(){showPicker('ctrl')}, 'mt-c'],
    ['Alt', function(){showPicker('alt')}, 'mt-a'],
    null,
    ['\\u2191', function(){send('ArrowUp','ArrowUp',38)}],
    ['\\u2193', function(){send('ArrowDown','ArrowDown',40)}],
    ['\\u2190', function(){send('ArrowLeft','ArrowLeft',37)}],
    ['\\u2192', function(){send('ArrowRight','ArrowRight',39)}],
  ].forEach(function(k) {
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
  applyPad(TOOLBAR_H);
})();
`;
