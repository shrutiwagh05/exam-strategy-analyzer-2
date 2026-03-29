// Global variables
let currentData = [];
let strategyChart = null;
let timeDistributionChart = null;

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, setting up file handlers...');
    
    // Get elements
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInfo = document.getElementById('fileInfo');
    const previewSection = document.getElementById('previewSection');
    const previewBody = document.getElementById('previewBody');
    const resultsSection = document.getElementById('resultsSection');
    const resultsContent = document.getElementById('resultsContent');

    // Function to handle file processing
    window.processFile = function(file) {
        console.log('Processing file:', file.name);
        
        if (!file) {
            fileInfo.innerHTML = '❌ No file selected';
            return;
        }
        
        fileInfo.innerHTML = `📄 Reading: ${file.name} (${(file.size / 1024).toFixed(1)} KB)...`;
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            console.log('File loaded successfully');
            const data = new Uint8Array(e.target.result);
            
            try {
                // Parse with SheetJS
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "" });
                
                console.log('Rows found:', rows.length);
                
                if (!rows || rows.length < 2) {
                    fileInfo.innerHTML = '❌ No data rows found in file';
                    resultsContent.innerHTML = '<div class="error-message">No data rows found in file</div>';
                    resultsSection.style.display = 'block';
                    return;
                }
                
                // Detect headers
                const headers = rows[0];
                console.log('Headers:', headers);
                
                let studentIdx = -1;
                let qIndices = [];
                
                for (let i = 0; i < headers.length; i++) {
                    const h = String(headers[i]).toLowerCase();
                    if (h.includes('student') || h.includes('id')) studentIdx = i;
                    if (h.includes('q') || h.includes('col') || h.includes('time') || (h.match(/\d/) && i > 0)) {
                        qIndices.push(i);
                    }
                }
                
                // If no question columns found, take columns 1-5
                if (qIndices.length === 0) {
                    qIndices = [1, 2, 3, 4, 5];
                }
                
                console.log('Student index:', studentIdx);
                console.log('Question indices:', qIndices);
                
                // Parse data
                const normalized = [];
                for (let i = 1; i < rows.length && i <= 10000; i++) {
                    const row = rows[i];
                    if (!row || row.length === 0) continue;
                    
                    let studentId = '';
                    if (studentIdx >= 0 && row[studentIdx]) {
                        studentId = String(row[studentIdx]).trim();
                    } else if (row[0]) {
                        studentId = String(row[0]).trim();
                    } else {
                        continue;
                    }
                    
                    if (!studentId) continue;
                    
                    const times = [];
                    for (let j = 0; j < Math.min(5, qIndices.length); j++) {
                        const val = row[qIndices[j]];
                        const numVal = parseFloat(val);
                        times.push(isNaN(numVal) ? 0 : numVal);
                    }
                    
                    if (times.length >= 3) {
                        const qTimes = [...times];
                        while (qTimes.length < 5) qTimes.push(0);
                        normalized.push({
                            student_id: studentId,
                            q1: qTimes[0], q2: qTimes[1], q3: qTimes[2], q4: qTimes[3], q5: qTimes[4]
                        });
                    }
                }
                
                console.log('Parsed students:', normalized.length);
                
                if (normalized.length === 0) {
                    fileInfo.innerHTML = '❌ Could not parse file. Check format.';
                    resultsContent.innerHTML = '<div class="error-message">Could not parse file. Expected Student ID and 5 question time columns.</div>';
                    resultsSection.style.display = 'block';
                    return;
                }
                
                currentData = normalized;
                fileInfo.innerHTML = `✅ Loaded: ${normalized.length} students from ${file.name}`;
                
                // Show preview
                previewBody.innerHTML = '';
                for (let i = 0; i < Math.min(10, normalized.length); i++) {
                    const r = normalized[i];
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><strong>${escapeHtml(r.student_id)}</strong></td>
                        <td>${r.q1}</td>
                        <td>${r.q2}</td>
                        <td>${r.q3}</td>
                        <td>${r.q4}</td>
                        <td>${r.q5}</td>
                    `;
                    previewBody.appendChild(tr);
                }
                previewSection.style.display = 'block';
                
                // Analyze data
                analyzeData(normalized);
                
            } catch (err) {
                console.error('Parse error:', err);
                fileInfo.innerHTML = '❌ Error parsing file';
                resultsContent.innerHTML = '<div class="error-message">Error parsing file: ' + err.message + '</div>';
                resultsSection.style.display = 'block';
            }
        };
        
        reader.onerror = function() {
            console.error('File read error');
            fileInfo.innerHTML = '❌ Error reading file';
            resultsContent.innerHTML = '<div class="error-message">File read error. Please try again.</div>';
            resultsSection.style.display = 'block';
        };
        
        reader.readAsArrayBuffer(file);
    };
    
    // File input change handler
    fileInput.addEventListener('change', function(e) {
        console.log('File input changed');
        if (e.target.files && e.target.files.length > 0) {
            window.processFile(e.target.files[0]);
        }
    });
    
    // Click on drop zone
    dropZone.addEventListener('click', function(e) {
        // Don't trigger if clicking on the button
        if (e.target === uploadBtn || uploadBtn.contains(e.target)) {
            return;
        }
        console.log('Drop zone clicked');
        fileInput.click();
    });
    
    // Drag and drop handlers
    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
    });
    
    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        console.log('File dropped');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            window.processFile(e.dataTransfer.files[0]);
        }
    });
    
    console.log('File handlers set up successfully');
});

// Percentile calculation
function percentile(sortedArr, p) {
    if (sortedArr.length === 0) return 0;
    const index = (sortedArr.length - 1) * p;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sortedArr[lower];
    return sortedArr[lower] * (upper - index) + sortedArr[upper] * (index - lower);
}

// Classification based on average time only
function classifyStrategy(avgTime, globalAvgTimeArray) {
    if (!globalAvgTimeArray || globalAvgTimeArray.length === 0) return "Balanced-Attempt";
    const sorted = [...globalAvgTimeArray].sort((a, b) => a - b);
    const p33 = percentile(sorted, 0.33);
    const p67 = percentile(sorted, 0.67);
    if (avgTime <= p33) return "Fast-Attempt";
    else if (avgTime >= p67) return "Slow-Attempt";
    else return "Balanced-Attempt";
}

// Calculate per-student metrics
function computeStudentMetrics(data) {
    const studentMap = new Map();
    for (let row of data) {
        const sid = row.student_id;
        const times = [row.q1, row.q2, row.q3, row.q4, row.q5].filter(t => !isNaN(t) && t !== null && t !== "");
        if (times.length === 0) continue;
        
        const sum = times.reduce((a, b) => a + b, 0);
        const mean = sum / times.length;
        
        studentMap.set(sid, {
            student_id: sid,
            avg_time: mean,
            times: times
        });
    }
    
    const metrics = Array.from(studentMap.values());
    const allAvgTimes = metrics.map(m => m.avg_time);
    return { metrics, allAvgTimes };
}

// Destroy charts
function destroyCharts() {
    if (strategyChart) { strategyChart.destroy(); strategyChart = null; }
    if (timeDistributionChart) { timeDistributionChart.destroy(); timeDistributionChart = null; }
}

// Create charts
function createCharts(studentClassifications, allAvgTimes, p33Val, p67Val) {
    const fastCount = studentClassifications.filter(s => s.strategy === "Fast-Attempt").length;
    const balancedCount = studentClassifications.filter(s => s.strategy === "Balanced-Attempt").length;
    const slowCount = studentClassifications.filter(s => s.strategy === "Slow-Attempt").length;
    
    const strategyCtx = document.getElementById('strategyChartCanvas');
    if (strategyCtx) {
        if (strategyChart) strategyChart.destroy();
        strategyChart = new Chart(strategyCtx, {
            type: 'doughnut',
            data: {
                labels: ['Fast-Attempt', 'Balanced-Attempt', 'Slow-Attempt'],
                datasets: [{
                    data: [fastCount, balancedCount, slowCount],
                    backgroundColor: ['#2e9c5e', '#f5b042', '#e65c3c'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#cbd5e1' } },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw} students (${((ctx.raw / studentClassifications.length)*100).toFixed(1)}%)` } }
                }
            }
        });
    }
    
    const timeCtx = document.getElementById('timeChartCanvas');
    if (timeCtx) {
        if (timeDistributionChart) timeDistributionChart.destroy();
        const maxTime = Math.max(...allAvgTimes);
        const minTime = Math.min(...allAvgTimes);
        const binCount = 15;
        const binWidth = (maxTime - minTime) / binCount;
        const bins = Array(binCount).fill(0);
        const binLabels = [];
        
        for (let i = 0; i < binCount; i++) {
            const lower = minTime + i * binWidth;
            const upper = lower + binWidth;
            binLabels.push(`${lower.toFixed(0)}-${upper.toFixed(0)}`);
            allAvgTimes.forEach(time => {
                if (time >= lower && (i === binCount - 1 ? time <= upper : time < upper)) {
                    bins[i]++;
                }
            });
        }
        
        timeDistributionChart = new Chart(timeCtx, {
            type: 'bar',
            data: {
                labels: binLabels,
                datasets: [{
                    label: 'Number of Students',
                    data: bins,
                    backgroundColor: '#2c5f7a',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: '#94a3b8', rotation: 45 }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    }
}

// Main analysis function
function analyzeData(data) {
    const resultsContent = document.getElementById('resultsContent');
    const resultsSection = document.getElementById('resultsSection');
    
    if (!data || data.length === 0) {
        resultsContent.innerHTML = '<div class="error-message">❌ No valid data found</div>';
        resultsSection.style.display = 'block';
        return;
    }
    
    const { metrics, allAvgTimes } = computeStudentMetrics(data);
    if (metrics.length === 0) {
        resultsContent.innerHTML = '<div class="error-message">❌ No valid student data found. Check file format.</div>';
        resultsSection.style.display = 'block';
        return;
    }
    
    const studentClassifications = metrics.map(m => ({
        ...m,
        strategy: classifyStrategy(m.avg_time, allAvgTimes)
    }));
    studentClassifications.sort((a, b) => a.avg_time - b.avg_time);
    
    const globalAvgTime = allAvgTimes.reduce((a, b) => a + b, 0) / allAvgTimes.length;
    const globalMedian = [...allAvgTimes].sort((a, b) => a - b)[Math.floor(allAvgTimes.length / 2)] || 0;
    const p33Val = percentile([...allAvgTimes].sort((a,b)=>a-b), 0.33);
    const p67Val = percentile([...allAvgTimes].sort((a,b)=>a-b), 0.67);
    
    const fastCount = studentClassifications.filter(s => s.strategy === "Fast-Attempt").length;
    const balancedCount = studentClassifications.filter(s => s.strategy === "Balanced-Attempt").length;
    const slowCount = studentClassifications.filter(s => s.strategy === "Slow-Attempt").length;
    
    let tableRows = '';
    for (let s of studentClassifications) {
        const strategyClass = s.strategy === 'Fast-Attempt' ? 'strategy-fast' : 
                              (s.strategy === 'Balanced-Attempt' ? 'strategy-balanced' : 'strategy-slow');
        const timesStr = s.times.join(', ');
        tableRows += `
            <tr>
                <td><strong>${escapeHtml(s.student_id)}</strong></td>
                <td>${s.avg_time.toFixed(1)} s</td>
                <td style="font-size:0.75rem;">${timesStr}</td>
                <td><span class="strategy-badge ${strategyClass}">${s.strategy}</span></td>
            </tr>
        `;
    }
    
    resultsContent.innerHTML = `
        <div class="metrics-grid">
            <div class="metric"><div class="metric-label">📊 Students</div><div class="metric-value">${metrics.length}</div></div>
            <div class="metric"><div class="metric-label">⏱️ Global Avg Time</div><div class="metric-value">${globalAvgTime.toFixed(1)} s</div></div>
            <div class="metric"><div class="metric-label">📈 Median Time</div><div class="metric-value">${globalMedian.toFixed(1)} s</div></div>
            <div class="metric"><div class="metric-label">⚡ Fast</div><div class="metric-value" style="color:#2e9c5e;">${fastCount}</div></div>
            <div class="metric"><div class="metric-label">⚖️ Balanced</div><div class="metric-value" style="color:#f5b042;">${balancedCount}</div></div>
            <div class="metric"><div class="metric-label">🐢 Slow</div><div class="metric-value" style="color:#e65c3c;">${slowCount}</div></div>
        </div>
        
        <div class="charts-container">
            <div class="chart-box"><h4>📊 Strategy Distribution</h4><canvas id="strategyChartCanvas"></canvas></div>
            <div class="chart-box"><h4>📈 Average Time Distribution</h4><canvas id="timeChartCanvas"></canvas></div>
        </div>
        
        <div class="results-table-wrapper">
            <table class="results-table">
                <thead><tr><th>Student ID</th><th>Avg Time</th><th>Times (Q1-Q5)</th><th>Strategy</th></tr></thead>
                <tbody>${tableRows}</tbody>
            </table>
        </div>
        
        <div class="detail-text">
            ⚙️ <strong>CLASSIFICATION LOGIC:</strong> Based ONLY on Average Time per Question<br>
            • <span style="color:#2e9c5e;">Fast-Attempt:</span> Avg time ≤ ${p33Val.toFixed(1)}s (33rd percentile - fastest third)<br>
            • <span style="color:#f5b042;">Balanced-Attempt:</span> ${p33Val.toFixed(1)}s &lt; Avg time &lt; ${p67Val.toFixed(1)}s (middle third)<br>
            • <span style="color:#e65c3c;">Slow-Attempt:</span> Avg time ≥ ${p67Val.toFixed(1)}s (67th percentile - slowest third)
        </div>
    `;
    
    resultsSection.style.display = 'block';
    
    setTimeout(() => {
        createCharts(studentClassifications, allAvgTimes, p33Val, p67Val);
    }, 100);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
}