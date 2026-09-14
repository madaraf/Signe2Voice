
    // ==================== Gemini API Configuration ====================
    const GEMINI_API_KEY = process.env.GOOGLE_API_KEY;
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;
    
    let isProcessingGemini = false;
    let lastGeminiUpdate = 0;
    const GEMINI_UPDATE_INTERVAL = 2000; // Process every 2 seconds for gestures
    let gestureSequence = []; // Store the sequence of gestures
    
    // ==================== UI Toggles & State Management ====================
    let sessionStartTime = null;
    let detectionCount = 0;
    let sessionTimer = null;

    function showVoice(){
      document.getElementById('voiceSection').classList.add('active-section');
      document.getElementById('signSection').classList.remove('active-section');
      document.getElementById('voiceBtn').classList.add('active');
      document.getElementById('signBtn').classList.remove('active');
      updateStatus('voiceStatus', 'Ready', false);
    }

    function showSign(){
      document.getElementById('voiceSection').classList.remove('active-section');
      document.getElementById('signSection').classList.add('active-section');
      document.getElementById('signBtn').classList.add('active');
      document.getElementById('voiceBtn').classList.remove('active');
      updateStatus('signStatus', 'Ready', false);
    }

    function updateStatus(elementId, text, isActive){
      const statusBadge = document.getElementById(elementId);
      if(statusBadge){
        statusBadge.textContent = text;
        if(isActive){
          statusBadge.classList.add('recording');
        } else {
          statusBadge.classList.remove('recording');
        }
      }
    }

    function startSessionTimer(){
      if(!sessionStartTime){
        sessionStartTime = Date.now();
        sessionTimer = setInterval(() => {
          const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
          const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
          const seconds = (elapsed % 60).toString().padStart(2, '0');
          document.getElementById('sessionTime').textContent = `${minutes}:${seconds}`;
        }, 1000);
      }
    }

    function incrementDetectionCount(){
      detectionCount++;
      document.getElementById('detectionCount').textContent = detectionCount;
    }

    function clearVoiceTranscript(){
      fullTranscript = '';
      document.getElementById('voiceTranscript').innerHTML = '<p class="placeholder-text"><i class="fas fa-info-circle"></i> Press "Start Listening" and speak in Arabic</p>';
    }

    function clearSharedText(){
      sharedText = '';
      gestureSequence = []; // Clear gesture sequence
      updateSharedBox();
      
      // Clear Gemini analysis as well
      const analysisBox = document.getElementById('geminiAnalysis');
      if (analysisBox) {
        analysisBox.innerHTML = '<p class="placeholder-text"><i class="fas fa-comments"></i> قم بعمل إشارات وسأخبرك ماذا تحاول أن تقول...</p>';
      }
      lastGeminiUpdate = 0;
    }

    // ==================== Speech Recognition (Enhanced with UI Feedback) ====================
    let recognition = null;
    let isListening = false;
    let fullTranscript = '';

    const startVoiceBtn = document.getElementById('startVoiceBtn');
    const stopVoiceBtn = document.getElementById('stopVoiceBtn');

    if (window.SpeechRecognition || window.webkitSpeechRecognition) {
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'ar-DZ';

      recognition.onstart = () => {
        updateStatus('voiceStatus', 'Listening...', true);
        startSessionTimer();
        activateVisualizer();
      };

      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++){
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal){
            fullTranscript += t + ' ';
            appendShared(t); 
            incrementDetectionCount();
          } else {
            interim += t;
          }
        }
        const displayText = escapeHtml(fullTranscript + interim);
        document.getElementById('voiceTranscript').innerHTML = `<p style="white-space: pre-wrap;">${displayText}</p>`;
      };

      recognition.onerror = (e) => { 
        console.error('Speech error', e); 
        updateStatus('voiceStatus', 'Error', false);
        deactivateVisualizer();
      };

      recognition.onend = () => { 
        isListening = false; 
        startVoiceBtn.disabled = false; 
        stopVoiceBtn.disabled = true; 
        updateStatus('voiceStatus', 'Ready', false);
        deactivateVisualizer();
        if (analyser) analyser.disconnect(); 
      };

      startVoiceBtn.addEventListener('click', ()=>{
        if (!recognition) return;
        try { 
          recognition.start(); 
          isListening=true; 
          startVoiceBtn.disabled=true; 
          stopVoiceBtn.disabled=false; 
          startPitchDetection(); 
        }
        catch(e){ 
          console.warn('Recognition start error',e); 
          updateStatus('voiceStatus', 'Error', false);
        }
      });

      stopVoiceBtn.addEventListener('click', ()=>{ 
        recognition.stop(); 
        isListening=false; 
        startVoiceBtn.disabled=false; 
        stopVoiceBtn.disabled=true; 
        updateStatus('voiceStatus', 'Ready', false);
        document.getElementById('pitchBar').style.width='0%'; 
        document.getElementById('pitchValue').textContent='0 dB'; 
        deactivateVisualizer();
      });

    } else {
      startVoiceBtn.disabled = true;
      document.getElementById('voiceTranscript').innerHTML = '<p style="color:#ef4444">Speech recognition not supported in this browser.</p>';
      updateStatus('voiceStatus', 'Unsupported', false);
    }

    function escapeHtml(s){ return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

    function activateVisualizer(){
      const bars = document.querySelector('.visualizer-bars');
      if(bars) bars.classList.add('active');
    }

    function deactivateVisualizer(){
      const bars = document.querySelector('.visualizer-bars');
      if(bars) bars.classList.remove('active');
    }

    // ==================== Pitch Detection (Enhanced Web Audio) ====================
    let audioContext=null, analyser=null, micSource=null;
    
    function startPitchDetection(){
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser(); 
      analyser.fftSize = 256;
      
      navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{
        micSource = audioContext.createMediaStreamSource(stream);
        micSource.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        
        function update(){ 
          if (!isListening) return; 
          analyser.getByteFrequencyData(data); 
          const avg = data.reduce((a,b)=>a+b,0)/data.length; 
          const percentage = Math.min((avg / 128) * 100, 100);
          
          document.getElementById('pitchBar').style.width = percentage + '%'; 
          document.getElementById('pitchValue').textContent = Math.round(avg)+' dB'; 
          
          requestAnimationFrame(update);
        } 
        update();
      }).catch(err=>{
        console.warn('Audio error',err);
        updateStatus('voiceStatus', 'Mic Error', false);
      });
    }

    // ==================== Shared Text Buffer ====================
    let sharedText = "";
    const sharedTextBox = document.getElementById("sharedText");

    function updateSharedBox() {
      if(sharedText.trim()){
        sharedTextBox.innerHTML = `<p style="white-space: pre-wrap;">${escapeHtml(sharedText)}</p>`;
      } else {
        sharedTextBox.innerHTML = '<p class="placeholder-text">No content yet...</p>';
      }
      // Auto-scroll to bottom
      sharedTextBox.scrollTop = sharedTextBox.scrollHeight;
      
      // Trigger Gemini analysis for gesture sequences
      const now = Date.now();
      if (gestureSequence.length >= 2 && !isProcessingGemini && (now - lastGeminiUpdate) >= GEMINI_UPDATE_INTERVAL) {
        processGesturesWithGemini(gestureSequence);
        lastGeminiUpdate = now;
      }
    }

    function appendShared(text) {
      sharedText += text + " ";
      
      // Track gesture sequence (only for sign language detections)
      if (text.includes('✊') || text.includes('👋') || text.includes('✋') || 
          text.includes('✌️') || text.includes('☝️') || text.includes('🤙') || 
          text.includes('👌') || text.includes('✔️') || text.includes('❌') ||
          text.includes('ONE') || text.includes('TWO') || text.includes('THREE') ||
          text.includes('FOUR') || text.includes('FIVE') || text.includes('YES') ||
          text.includes('NO') || text.includes('HELLO') || text.includes('STOP') ||
          text.includes('FIST') || text.includes('PEACE') || text.includes('OK') ||
          text.includes('CALL ME')) {
        gestureSequence.push({
          gesture: text.trim(),
          timestamp: Date.now()
        });
        
        // Keep only last 20 gestures to avoid overflow
        if (gestureSequence.length > 20) {
          gestureSequence.shift();
        }
      }
      
      updateSharedBox();
    }
    
    // ==================== Gemini AI Processing ====================
    async function processGesturesWithGemini(gestures) {
      if (gestures.length < 2 || isProcessingGemini) return;
      
      isProcessingGemini = true;
      
      // Show processing indicator
      const analysisBox = document.getElementById('geminiAnalysis');
      if (analysisBox) {
        analysisBox.innerHTML = '<p class="placeholder-text"><i class="fas fa-spinner fa-spin"></i> جاري التفكير...</p>';
      }
      
      // Create gesture sequence string
      const gestureList = gestures.map(g => g.gesture).join(' → ');
      
      try {
        const response = await fetch(GEMINI_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are a sign language interpreter. The user made this sequence of hand gestures: ${gestureList}

Gesture meanings:
- ONE ☝️: number 1, wait, first
- TWO ✌️: number 2, peace, victory
- THREE: number 3
- FOUR: number 4
- FIVE ✋: number 5, stop
- HELLO 👋: greeting, hello
- YES ✔️: agreement, yes
- NO ❌: disagreement, no
- STOP ✋: stop command
- FIST ✊: good bye
- PEACE ✌️: peace, victory
- OK 👌: okay, good
- CALL ME 🤙: call me request

Task: Predict what the user is trying to communicate based on this gesture sequence. Think about natural conversations and messages people would make with these gestures.

CRITICAL RULES:
1. Give ONLY the predicted text/message in Arabic
2. NO explanations, NO descriptions, NO formatting, NO extra text
3. Just write what you think the person is saying as if YOU are that person
4. Maximum 1-2 short sentences
5. Be natural and conversational

Examples:
- HELLO → YES → TWO → Output: "مرحباً، نعم اثنان من فضلك"
- FIST → NO → STOP → Output: "لا! توقف الآن"
- ONE → TWO → THREE → Output: "واحد، اثنان، ثلاثة"

Now translate: ${gestureList}
Give ONLY the Arabic text, nothing else:`

              }]
            }],
            generationConfig: {
              temperature: 0.9,
              topK: 50,
              topP: 0.95,
              maxOutputTokens: 100,
            }
          })
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        let analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'لا يوجد تحليل متاح';
        
        // Clean up the response - remove any markdown, extra formatting, or explanations
        analysisText = analysisText.trim();
        // Remove markdown bold
        analysisText = analysisText.replace(/\*\*/g, '');
        // Remove any lines that look like headers or labels
        analysisText = analysisText.replace(/^[#*\-].*/gm, '');
        // Remove "Output:" or similar prefixes
        analysisText = analysisText.replace(/^(Output|الترجمة|المعنى|النص):\s*/gi, '');
        // Get just the first meaningful line
        const lines = analysisText.split('\n').filter(line => line.trim().length > 0);
        analysisText = lines[0] || analysisText;
        
        // Display the analysis - JUST THE TEXT, nothing more
        if (analysisBox) {
          analysisBox.innerHTML = `
            <div style="padding: 1.5rem; text-align: center;">
              <div style="font-size: 1.8rem; font-weight: 600; color: var(--accent-primary); line-height: 1.6; direction: rtl; margin-bottom: 0.5rem;">
                ${escapeHtml(analysisText)}
              </div>
              <div style="font-size: 0.75rem; opacity: 0.5; margin-top: 0.5rem;">
                ${new Date().toLocaleTimeString()}
              </div>
            </div>
          `;
        }
        
      } catch (error) {
        console.error('Gemini API error:', error);
        if (analysisBox) {
          analysisBox.innerHTML = `<p style="color: #ef4444; padding: 1rem;"><i class="fas fa-exclamation-triangle"></i> خطأ في تحليل الإشارات: ${error.message}</p>`;
        }
      } finally {
        isProcessingGemini = false;
      }
    }
    
    // Keep the old function for voice transcript analysis
    async function processTranscriptWithGemini(transcript) {
      if (!transcript.trim() || isProcessingGemini) return;
      
      isProcessingGemini = true;
      
      // Show processing indicator
      const analysisBox = document.getElementById('geminiAnalysis');
      if (analysisBox) {
        analysisBox.innerHTML = '<p class="placeholder-text"><i class="fas fa-spinner fa-spin"></i> AI is analyzing transcript...</p>';
      }
      
      try {
        const response = await fetch(GEMINI_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Analyze the following transcript and extract meaningful insights. Provide:
1. Main topics or themes discussed
2. Key points or important information
3. Sentiment/tone of the conversation
4. Any action items or important takeaways
5. A brief summary (2-3 sentences)

Transcript: "${transcript}"

Please format your response clearly with bullet points and sections.`
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1024,
            }
          })
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis available';
        
        // Display the analysis
        if (analysisBox) {
          analysisBox.innerHTML = `
            <div style="padding: 1rem;">
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; color: var(--accent-success);">
                <i class="fas fa-brain"></i>
                <strong>AI Insights</strong>
                <span style="font-size: 0.8em; opacity: 0.7;">(Updated ${new Date().toLocaleTimeString()})</span>
              </div>
              <div style="white-space: pre-wrap; line-height: 1.6;">${formatGeminiResponse(analysisText)}</div>
            </div>
          `;
        }
        
      } catch (error) {
        console.error('Gemini API error:', error);
        if (analysisBox) {
          analysisBox.innerHTML = `<p style="color: #ef4444; padding: 1rem;"><i class="fas fa-exclamation-triangle"></i> Error analyzing transcript: ${error.message}</p>`;
        }
      } finally {
        isProcessingGemini = false;
      }
    }
    
    function formatGeminiResponse(text) {
      // Convert markdown-style formatting to HTML
      let formatted = escapeHtml(text);
      
      // Bold text
      formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      // Bullet points
      formatted = formatted.replace(/^[•\-\*]\s+(.+)$/gm, '<li>$1</li>');
      formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul style="margin-left: 1.5rem; margin-top: 0.5rem; margin-bottom: 0.5rem;">$1</ul>');
      
      // Numbered lists
      formatted = formatted.replace(/^(\d+)\.\s+(.+)$/gm, '<li>$2</li>');
      
      // Headers
      formatted = formatted.replace(/^#{3}\s+(.+)$/gm, '<h4 style="color: var(--accent-primary); margin-top: 1rem; margin-bottom: 0.5rem;">$1</h4>');
      formatted = formatted.replace(/^#{2}\s+(.+)$/gm, '<h3 style="color: var(--accent-primary); margin-top: 1rem; margin-bottom: 0.5rem;">$1</h3>');
      formatted = formatted.replace(/^#{1}\s+(.+)$/gm, '<h2 style="color: var(--accent-primary); margin-top: 1rem; margin-bottom: 0.5rem;">$1</h2>');
      
      return formatted;
    }

    // ==================== MediaPipe Hands Setup ====================
    const video = document.getElementById('signVideo');
    const overlayCanvas = document.getElementById('overlayCanvas');
    const ctx = overlayCanvas.getContext('2d');
    const signOutput = document.getElementById('signOutput');
    const detectedLabel = document.getElementById('detectedLabel');

    let hands = null; 
    let camera = null;
    let lastDetectedSign = null;
    let detectionCooldown = false;

    function initHands(){
      hands = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
      hands.setOptions({maxNumHands:1, modelComplexity:1, minDetectionConfidence:0.75, minTrackingConfidence:0.6});
      hands.onResults(onHandsResults);
    }

    function resizeOverlay(){
      const rect = video.getBoundingClientRect();
      overlayCanvas.width = rect.width; overlayCanvas.height = rect.height; overlayCanvas.style.left = rect.left + 'px'; overlayCanvas.style.top = rect.top + 'px';
      overlayCanvas.style.width = rect.width + 'px'; overlayCanvas.style.height = rect.height + 'px';
    }

    function onHandsResults(results){
      // Sync canvas size to video display size
      overlayCanvas.width = video.clientWidth;
      overlayCanvas.height = video.clientHeight;
      ctx.clearRect(0,0,overlayCanvas.width,overlayCanvas.height);

      if (results.multiHandLandmarks && results.multiHandLandmarks.length){
        const landmarks = results.multiHandLandmarks[0];
        drawHandLandmarks(landmarks);
        const sign = detectSignLanguage(landmarks);
        
        if (sign && sign !== lastDetectedSign && !detectionCooldown){ 
          detectedLabel.textContent = sign;
          lastDetectedSign = sign;
          appendShared(sign);
          incrementDetectionCount();
          
          // Add visual feedback
          detectedLabel.style.animation = 'none';
          setTimeout(() => {
            detectedLabel.style.animation = 'pulse 0.5s ease-out';
          }, 10);
          
          // Cooldown to prevent spam
          detectionCooldown = true;
          setTimeout(() => {
            detectionCooldown = false;
          }, 1500);
        }
      } else {
        // No hand detected
        if(lastDetectedSign && Date.now() % 3000 < 100) {
          // Clear after 3 seconds of no detection
          lastDetectedSign = null;
        }
      }
    }

    function drawHandLandmarks(landmarks){
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,166,255,0.95)'; 
      ctx.fillStyle = 'rgba(0,166,255,0.95)';
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(0,166,255,0.8)';
      
      const w = overlayCanvas.width, h = overlayCanvas.height;
      const connections = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
      
      // Draw connections
      connections.forEach(([i,j])=>{ 
        ctx.beginPath(); 
        ctx.moveTo(landmarks[i].x*w, landmarks[i].y*h); 
        ctx.lineTo(landmarks[j].x*w, landmarks[j].y*h); 
        ctx.stroke(); 
      });
      
      // Draw landmarks
      landmarks.forEach((pt, idx)=>{ 
        ctx.beginPath(); 
        const size = idx === 0 || idx === 4 || idx === 8 || idx === 12 || idx === 16 || idx === 20 ? 8 : 6;
        ctx.arc(pt.x*w, pt.y*h, size, 0, Math.PI*2); 
        ctx.fill(); 
      });
      
      ctx.shadowBlur = 0;
    }

    // ---------- Improved geometric analysis ----------
    function distance(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); }

    function isFingerExtended(mcp, pip, dip, tip){
      // Normalize by mcp->wrist length
      // Check if each subsequent joint is "higher" (smaller y) than previous
      return (tip.y < dip.y) && (dip.y < pip.y) && (pip.y < mcp.y);
    }
    function isFingerCurled(mcp,pip,dip,tip,wrist){
      // Curled if tip is relatively close to palm/wrist
      return distance(tip,wrist) < 0.4 ;
    }

    // ——————————————————— IMPROVED HAND ANALYSIS ——————————————————— //
function analyzeHand(landmarks) {
    const wrist = landmarks[0];
    const thumb = [landmarks[1], landmarks[2], landmarks[3], landmarks[4]];
    const index = [landmarks[5], landmarks[6], landmarks[7], landmarks[8]];
    const middle = [landmarks[9], landmarks[10], landmarks[11], landmarks[12]];
    const ring = [landmarks[13], landmarks[14], landmarks[15], landmarks[16]];
    const pinky = [landmarks[17], landmarks[18], landmarks[19], landmarks[20]];

    // Calculate distances
    const distThumbIndex = distance(thumb[3], index[3]);
    const distIndexMiddle = distance(index[3], middle[3]);
    const distMiddleRing = distance(middle[3], ring[3]);
    const distRingPinky = distance(ring[3], pinky[3]);

    return {
        // Finger extension
        indexExtended: isFingerExtended(...index),
        middleExtended: isFingerExtended(...middle),
        ringExtended: isFingerExtended(...ring),
        pinkyExtended: isFingerExtended(...pinky),
        thumbExtended: distThumbIndex>0.35,

        // Finger curled
        indexCurled: distance(index[3], wrist) < 0.25,
        middleCurled: distance(middle[3], wrist) < 0.25,
        ringCurled:distance(ring[3], wrist) < 0.25,
        pinkyCurled: distance(pinky[3], wrist) < 0.25,
        thumbCurled: distance(thumb[3], wrist) < 0.25,

        // Thumb position
        thumbNearIndex: distThumbIndex < 0.04,
        thumbAcrossPalm: (thumb[3].x > wrist.x )&& distance(thumb[3], index[3]) < 0.25,

        // Palm orientation
        palmFacingCamera: landmarks[5].x < landmarks[17].x,

        // Distances between fingers
        distThumbIndex: distThumbIndex,
        distIndexMiddle: distIndexMiddle,
        distMiddleRing: distMiddleRing,
        distRingPinky: distRingPinky
    };
}

// ——————————————————— LETTER DETECTION ——————————————————— //
function detectSignLanguage(landmarks) {
    const h = analyzeHand(landmarks);

    // if(h.indexCurled){return 'index curled';}
    // if(h.middleCurled){return 'middle curled';}
    // if(h.ringCurled){return 'ring curled';}
    // if(h.pinkyCurled){return 'pinky curled';}
    // FIST
    if (h.indexCurled && h.middleCurled && h.ringCurled && h.pinkyCurled && h.thumbCurled) { return 'FIST ✊'; }

    
    if (h.indexExtended && h.thumbExtended && h.middleCurled && h.pinkyCurled && h.ringCurled) { return 'HELLO 👋'; }
    if (h.indexExtended && h.middleExtended && h.ringExtended && h.pinkyExtended && h.thumbAcrossPalm) { return 'STOP ✋/FIVE'; }
    if (h.indexExtended && h.thumbCurled && h.middleExtended && h.pinkyExtended && h.ringExtended) { return 'FOUR'; }
    if (h.indexExtended && h.thumbCurled && h.middleExtended && h.pinkyCurled && h.ringExtended) { return 'THREE'; }
    if (h.indexExtended && h.middleExtended && h.ringCurled && h.pinkyCurled&& h.thumbCurled) { return 'TWO / PEACE ✌️'; }
    if (h.indexExtended && h.thumbCurled && h.middleCurled && h.pinkyCurled && h.ringCurled) { return 'ONE ☝️'; }



    if (h.thumbAcrossPalm && h.indexCurled && h.middleCurled && h.ringCurled && h.pinkyExtended) { return 'CALL ME 🤙'; }

    if (h.thumbNearIndex && h.middleExtended && h.ringExtended && h.pinkyExtended) { return 'OK 👌'; }

 
    if (h.indexCurled && h.middleCurled && h.ringCurled && h.pinkyCurled && h.thumbAcrossPalm) { return 'YES ✔️'; }
    if (h.indexExtended && h.middleExtended && h.ringCurled && h.pinkyCurled && h.thumbExtended) { return 'NO ❌'; }

    // // ——————————————————— LETTERS ——————————————————— //

    // if (h.thumbExtended && h.indexCurled && h.middleCurled && h.ringCurled && h.pinkyCurled) { return 'A 🅰️'; }
    // if (h.indexExtended && h.middleExtended && h.ringExtended && h.pinkyExtended && h.thumbCurled) { return 'B 🅱️'; }


    // if (h.thumbNearIndex && h.indexCurled && h.middleCurled && h.ringCurled && h.pinkyCurled) { return 'C 🅲️'; }

    // if (h.indexExtended && h.middleCurled && h.ringCurled && h.pinkyCurled && h.thumbCurled) { return 'D 🅳️'; }

    // if (h.indexCurled && h.middleCurled && h.ringCurled && h.pinkyCurled && h.thumbCurled) { return 'E 🅴️'; }

    // if (h.thumbExtended && h.indexExtended && h.middleCurled && h.ringCurled && h.pinkyCurled) { return 'F 🅵️'; }

    // if (h.indexExtended && h.thumbNearIndex && h.middleCurled && h.ringCurled && h.pinkyCurled) { return 'G 🅶️'; }


    // if (h.indexExtended && h.middleExtended && h.ringCurled && h.pinkyCurled && h.thumbCurled) { return 'H 🅷️'; }

    // if (h.pinkyExtended && h.indexCurled && h.middleCurled && h.ringCurled && h.thumbCurled) { return 'I 🅸️'; }

    // if (h.indexExtended && h.thumbNearIndex && h.middleCurled && h.ringCurled && h.pinkyCurled) { return 'J 🅹️'; }

    // if (h.indexExtended && h.middleExtended && h.ringCurled && h.pinkyCurled && h.thumbNearIndex) { return 'K 🅺️'; }

    // if (h.indexExtended && h.thumbExtended && h.middleCurled && h.ringCurled && h.pinkyCurled) { return 'L 🅻️'; }


    // if (h.indexExtended && h.middleExtended && h.ringExtended && h.pinkyCurled && h.thumbCurled) { return 'M 🅼️'; }

    // if (h.indexExtended && h.middleExtended && h.ringCurled && h.pinkyCurled && h.thumbCurled) { return 'N 🅽️'; }


    // if (h.thumbNearIndex && h.indexExtended && h.middleCurled && h.ringCurled && h.pinkyCurled) { return 'O 🅾️'; }

    // if (h.indexExtended && h.thumbNearIndex && h.middleCurled && h.ringCurled && h.pinkyCurled) { return 'P 🅿️'; }


    // if (h.indexExtended && h.thumbNearIndex && h.middleCurled && h.ringCurled && h.pinkyCurled) { return 'Q 🆀️'; }

    // if (h.indexExtended && h.middleExtended && h.ringCurled && h.pinkyCurled && h.thumbCurled) { return 'R 🆁️'; }

    // if (h.thumbExtended && h.indexCurled && h.middleCurled && h.ringCurled && h.pinkyCurled) { return 'S 🆂️'; }

    // if (h.indexExtended && h.thumbNearIndex && h.middleCurled && h.ringCurled && h.pinkyCurled) { return 'T 🆃️'; }

    // // U: Index and middle fingers extended, thumb touching pinky
    // if (h.indexExtended && h.middleExtended && h.ringCurled && h.pinkyCurled && h.thumbCurled) { return 'U 🆄️'; }

    // // V: Index and middle fingers extended, others curled
    // if (h.indexExtended && h.middleExtended && h.ringCurled && h.pinkyCurled && h.thumbCurled) { return 'V 🆅️'; }

    // // W: Three fingers extended, thumb touching pinky
    // if (h.indexExtended && h.middleExtended && h.ringExtended && h.pinkyCurled && h.thumbCurled) { return 'W 🆆️'; }

    // // X: Index finger crossed
    // if (h.indexExtended && h.middleCurled && h.ringCurled && h.pinkyCurled && h.thumbCurled) { return 'X 🆇️'; }

    // // Y: Pinky finger extended, thumb extended
    // if (h.pinkyExtended && h.thumbExtended && h.indexCurled && h.middleCurled && h.ringCurled) { return 'Y 🆈️'; }

    // // Z: Index finger tracing Z
    // if (h.indexExtended && h.middleCurled && h.ringCurled && h.pinkyCurled && h.thumbCurled) { return 'Z 🆉️'; }

    return null;
}

    // ==================== Camera Controls & Events ====================
    const startSignBtn = document.getElementById('startSignBtn');
    const stopSignBtn = document.getElementById('stopSignBtn');
    const captureSignBtn = document.getElementById('captureSignBtn');
    let streamRef = null;

    startSignBtn.addEventListener('click', async ()=>{
      try{
        initHands();
        streamRef = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user', width:640, height:480}, audio:false});
        video.srcObject = streamRef;
        startSignBtn.disabled=true; 
        stopSignBtn.disabled=false; 
        captureSignBtn.disabled=false;
        
        updateStatus('signStatus', 'Active', true);
        startSessionTimer();
        
        // Show camera indicator
        const indicator = document.querySelector('.camera-indicator');
        if(indicator) indicator.classList.add('active');

        camera = new Camera(video, { 
          onFrame: async ()=>{ await hands.send({image: video}); }, 
          width:640, 
          height:480 
        });
        await camera.start();

        // Keep overlay sized to displayed video
        const ro = new ResizeObserver(()=>{ 
          overlayCanvas.width = video.clientWidth; 
          overlayCanvas.height = video.clientHeight; 
        });
        ro.observe(video);

      } catch(err){ 
        console.error('camera err', err); 
        signOutput.innerHTML = `<p style="color:#ef4444; text-align:center; padding:2rem;"><i class="fas fa-exclamation-triangle" style="font-size:2rem; display:block; margin-bottom:1rem;"></i>Camera error: ${err.message}</p>`;
        updateStatus('signStatus', 'Error', false);
      }
    });

    stopSignBtn.addEventListener('click', ()=>{ 
      if (camera) camera.stop(); 
      if (streamRef){ 
        streamRef.getTracks().forEach(t=>t.stop()); 
        streamRef=null; 
      } 
      startSignBtn.disabled=false; 
      stopSignBtn.disabled=true; 
      captureSignBtn.disabled=true; 
      detectedLabel.textContent='—'; 
      lastDetectedSign = null;
      ctx.clearRect(0,0,overlayCanvas.width,overlayCanvas.height); 
      updateStatus('signStatus', 'Ready', false);
      
      // Hide camera indicator
      const indicator = document.querySelector('.camera-indicator');
      if(indicator) indicator.classList.remove('active');
      
      // Reset sign output
      signOutput.innerHTML = `<div class="sign-instructions">
        <i class="fas fa-hand-paper"></i>
        <p>Supported gestures: HELLO, STOP, YES, NO, PEACE, FIST, ONE-FIVE, CALL ME, OK</p>
      </div>`;
    });

    // Capture snapshot of current frame + overlay
    captureSignBtn.addEventListener('click', ()=>{
      const snap = document.createElement('canvas'); 
      snap.width = video.videoWidth; 
      snap.height = video.videoHeight; 
      const sctx = snap.getContext('2d');
      sctx.drawImage(video, 0, 0, snap.width, snap.height);
      
      const displayW = overlayCanvas.width, displayH = overlayCanvas.height;
      if (displayW && displayH){
        sctx.drawImage(overlayCanvas, 0, 0, displayW, displayH, 0, 0, snap.width, snap.height);
      }
      
      const dataUrl = snap.toDataURL('image/png');
      signOutput.innerHTML = `
        <div style="text-align:center; padding:1rem;">
          <p style="color:var(--accent-success); margin-bottom:1rem;">
            <i class="fas fa-check-circle"></i> Snapshot captured!
          </p>
          <a href="${dataUrl}" download="sign_snapshot_${Date.now()}.png" 
             style="display:inline-block; padding:0.75rem 1.5rem; background:var(--gradient-primary); 
             color:white; border-radius:10px; text-decoration:none; font-weight:600; margin-bottom:1rem;">
            <i class="fas fa-download"></i> Download PNG
          </a>
          <img style="max-width:100%; border-radius:10px; box-shadow:var(--shadow-md);" src="${dataUrl}" />
        </div>`;
    });

    // ==================== Cleanup ====================
    window.addEventListener('beforeunload', ()=>{ 
      if (camera) camera.stop(); 
      if (streamRef){ 
        streamRef.getTracks().forEach(t=>t.stop()); 
      } 
      if (analyser) analyser.disconnect(); 
      if (sessionTimer) clearInterval(sessionTimer);
    });

    // ==================== Initialize ====================
    console.log('%c🎉 Voice2Sign Loaded Successfully!', 'color: #00a6ff; font-size: 16px; font-weight: bold;');
    console.log('%c✨ Features: Voice-to-Text | Sign Language Detection | Real-time Translation', 'color: #10b981; font-size: 12px;');
    
    // Initialize shared text box
    updateSharedBox();

