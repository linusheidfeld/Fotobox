
window.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('camera');
  video.style.transform = 'scaleX(-1)';

  const canvasElement = document.createElement('canvas');
  canvasElement.style.position = 'fixed';
  canvasElement.style.zIndex = '1000';
  canvasElement.style.pointerEvents = 'none';
  document.body.appendChild(canvasElement);
  const canvasCtx = canvasElement.getContext('2d');

  const cursorDot = document.createElement('img');
  cursorDot.src = 'cursor.png';
  cursorDot.style.position = 'fixed';
  cursorDot.style.width = '40px';
  cursorDot.style.height = '40px';
  cursorDot.style.pointerEvents = 'none';
  cursorDot.style.zIndex = '9999';
  cursorDot.style.display = 'none';
  document.body.appendChild(cursorDot);

  const countdownOverlay = document.createElement('div');
countdownOverlay.className = 'countdown-overlay';
document.querySelector('.camera-wrapper').appendChild(countdownOverlay);

// 👉 Direkt hier folgende Styles setzen:
countdownOverlay.style.position = 'absolute';
countdownOverlay.style.top = '55%';
countdownOverlay.style.left = '40%';
countdownOverlay.style.transform = 'translate(-50%, -50%)';
countdownOverlay.style.fontSize = '50vw'; // 🔧 HIER kontrollierst du die Größe
countdownOverlay.style.fontWeight = '700';
countdownOverlay.style.fontFamily = "'ABCDiatypeRounded', sans-serif";
countdownOverlay.style.color = '#000';
countdownOverlay.style.webkitTextStroke = '0.5vw #fff';
countdownOverlay.style.zIndex = '3000';
countdownOverlay.style.pointerEvents = 'none';
countdownOverlay.style.userSelect = 'none';
countdownOverlay.style.display = 'none';
countdownOverlay.style.lineHeight = '1';
countdownOverlay.style.background = 'none';
countdownOverlay.style.textAlign = 'center';
countdownOverlay.style.opacity = '0.8'; // z. B. 0.5 für 50 % Deckkraft


  document.body.style.cursor = 'default';

  let clickCooldown = false;
  let handTrackingPaused = false;
  let currentHoverEl = null;
  let hoverStartTime = null;
  let hoverCooldown = false;
  let lastHandSeenTime = Date.now();

  function clearHover() {
    if (currentHoverEl) {
      currentHoverEl.classList.remove('hover');
      currentHoverEl = null;
      hoverStartTime = null;
    }
  }

  function simulateHover(el) {
    if (currentHoverEl !== el) {
      clearHover();
      if (el?.classList) {
        el.classList.add('hover');
        currentHoverEl = el;
        hoverStartTime = Date.now();
      }
    } else if (el === currentHoverEl && hoverStartTime && !hoverCooldown) {
      const hoveredFor = Date.now() - hoverStartTime;
      const HOVER_DELAY = 900;

      if (hoveredFor > HOVER_DELAY) {
        hoverStartTime = null;
        hoverCooldown = true;

        if (el.classList.contains('photo-button')) {
          startCountdownAndScreenshot(() => {
            hoverCooldown = false;
          });
        } else if (el.classList.contains('selectable')) {
          placeImage(el);
          setTimeout(() => hoverCooldown = false, 800);
        }
      }
    }
  }

  function simulateClick(el, x, y) {
    if (!el) return;
    const evt = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y,
      button: 0
    });
    el.dispatchEvent(evt);
    el.focus?.();
  }

  function onResults(results) {
    if (handTrackingPaused) {
    return; // Keine Handerkennung, wenn pausiert
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    canvasElement.width = vw;
    canvasElement.height = vh;
    canvasCtx.clearRect(0, 0, vw, vh);

    const hasHand = results.multiHandLandmarks?.length > 0;
    if (!hasHand) {
      clearHover();
      cursorDot.style.display = 'none';
      return;
    }

    lastHandSeenTime = Date.now();
    cursorDot.style.display = 'block';

    results.multiHandLandmarks.forEach((landmarks, i) => {
  const handedness = results.multiHandedness?.[i]?.label; // "Left" oder "Right"

  // Wähle das passende Cursor-Bild
  if (handedness === "Left") {
    cursorDot.src = 'cursor_left.png';
  } else {
    cursorDot.src = 'cursor_right.png';
  }

  const indexTip = landmarks[8];
  const thumbTip = landmarks[4];

  const cursorX = indexTip.x * vw;
  const cursorY = indexTip.y * vh * 1.05;

  cursorDot.style.left = `${cursorX - 20}px`;
  cursorDot.style.top = `${cursorY - 20}px`;

  const hoveredEl = document.elementFromPoint(cursorX, cursorY);
  simulateHover(hoveredEl);

  const dx = indexTip.x - thumbTip.x;
  const dy = indexTip.y - thumbTip.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < 0.05 && !clickCooldown) {
    simulateClick(hoveredEl, cursorX, cursorY);
    clickCooldown = true;
    setTimeout(() => (clickCooldown = false), 800);
  }
});

  }

  function startHandTracking() {
    const hands = new Hands({
      locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });
    hands.setOptions({
      selfieMode: true,
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7
    });
    hands.onResults(onResults);

    const camera = new Camera(video, {
      onFrame: async () => {
        await hands.send({ image: video });

        if (Date.now() - lastHandSeenTime > 10000) {
          location.reload();
        }
      },
      width: 640,
      height: 480
    });
    camera.start();
  }

  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play().then(() => {
          setTimeout(() => startHandTracking(), 300);
        });
      };
    })
    .catch(err => {
      console.error("Kamera konnte nicht gestartet werden:", err);
      alert("Fehler beim Zugriff auf die Kamera: " + err.message);
    });

  window.startCountdownAndScreenshot = function (onFinish) {
  handTrackingPaused = true;
  let count = 5;
  countdownOverlay.style.display = 'block';
  countdownOverlay.textContent = count;

  const interval = setInterval(() => {
    count--;
    if (count > 0) {
      countdownOverlay.textContent = count;
    } else {
      clearInterval(interval);
      countdownOverlay.style.display = 'none';
      takeScreenshot();
      handTrackingPaused = false;
      onFinish?.();
    }
  }, 1000);
};

  window.placeImage = function (imgElement) {
    const box4 = document.getElementById('box4');
    box4.innerHTML = '';
    const newImg = document.createElement('img');
    newImg.src = imgElement.src;
    newImg.alt = imgElement.alt;
    newImg.className = 'responsive-image';
    newImg.style.width = '100%';
    newImg.style.height = '100%';
    newImg.style.objectFit = 'cover';
    newImg.style.borderRadius = '0';
    box4.appendChild(newImg);
  };

 window.takeScreenshot = function () {
  const wrapper = document.querySelector('.camera-wrapper');
  const overlayImgPath = 'fehler.png';

  html2canvas(wrapper, {
    useCORS: true,
    backgroundColor: '#ffffff',
    scale: 2,
  }).then(canvas => {
    // Schritt 1: Screenshot in Graustufen umwandeln
    const ctxOriginal = canvas.getContext('2d');
    const imgData = ctxOriginal.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
      data[i] = data[i+1] = data[i+2] = gray;
    }
    ctxOriginal.putImageData(imgData, 0, 0);

    // Schritt 2: A5-Canvas vorbereiten
    const a5Width = 1240;
    const a5Height = 1748;
    const border = 0;

    const a5Canvas = document.createElement('canvas');
    a5Canvas.width = a5Width;
    a5Canvas.height = a5Height;
    const ctxA5 = a5Canvas.getContext('2d');

    ctxA5.fillStyle = '#ffffff';
    ctxA5.fillRect(0, 0, a5Width, a5Height);

    const maxContentWidth = a5Width - border * 2;
    const maxContentHeight = a5Height - border * 2;
    const scale = Math.min(maxContentWidth / canvas.width, maxContentHeight / canvas.height);
    const scaledWidth = canvas.width * scale;
    const scaledHeight = canvas.height * scale;
    const offsetX = (a5Width - scaledWidth) / 2;
    const offsetY = (a5Height - scaledHeight) / 2;

    ctxA5.drawImage(canvas, offsetX, offsetY, scaledWidth, scaledHeight);

    // Schritt 3: Overlay innerhalb desselben Bereichs zeichnen
    const overlay = new Image();
    overlay.crossOrigin = 'anonymous';
    overlay.src = overlayImgPath;
    overlay.onload = () => {
      ctxA5.drawImage(overlay, offsetX, offsetY, scaledWidth, scaledHeight);

      // Schritt 4: A4-Canvas vorbereiten
      const a4Width = 2480;
      const a4Height = 3508;
      const a4Canvas = document.createElement('canvas');
      a4Canvas.width = a4Width;
      a4Canvas.height = a4Height;
      const ctxA4 = a4Canvas.getContext('2d');

      ctxA4.fillStyle = '#ffffff';
      ctxA4.fillRect(0, 0, a4Width, a4Height);

      // Schritt 5: A5-Motiv zentriert auf A4 platzieren
      const centerX = (a4Width - a5Width) / 2;
      const centerY = -45
      ctxA4.drawImage(a5Canvas, centerX, centerY, a5Width, a5Height);

      // Schritt 6: JPG speichern statt PDF
      const finalImg = a4Canvas.toDataURL('image/jpeg', 1.0);
      const link = document.createElement('a');
      link.href = finalImg;
      link.download = 'fotomat_drucke_linus.jpg';
      link.click();
    };

    overlay.onerror = () => {
      alert('Fehlerbild konnte nicht geladen werden.');
    };
  });
};

});
