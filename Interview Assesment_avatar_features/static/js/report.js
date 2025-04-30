// report.js - Handles report visualization and download functionality
document.addEventListener('DOMContentLoaded', () => {
    // Make sure emotionData is defined
    if (typeof emotionData === 'undefined') {
        window.emotionData = {'neutral': 100};
        console.warn('emotionData not defined, using default values');
    }
    
    // Make sure eyeContactPercentage is defined
    if (typeof eyeContactPercentage === 'undefined') {
        window.eyeContactPercentage = 50;
        console.warn('eyeContactPercentage not defined, using default value of 50%');
    }
    
    // Make sure totalDuration is defined
    if (typeof totalDuration === 'undefined') {
        window.totalDuration = 300; // Default to 5 minutes
        console.warn('totalDuration not defined, using default value of 5 minutes');
    }
    
    // Generate charts
    createEmotionsChart();
    createEyeContactChart();
    createEngagementTimelineChart();
    
    // Set up download button
    const downloadButton = document.getElementById('download-report');
    if (downloadButton) {
        downloadButton.addEventListener('click', downloadReport);
    }
});


// Create emotions distribution chart
function createEmotionsChart() {
    const ctx = document.getElementById('emotions-chart').getContext('2d');
    
    // Prepare data
    const labels = Object.keys(emotionData);
    const data = Object.values(emotionData);
    
    // Generate colors for each emotion with improved palette
    const colors = generateColorsForEmotions(labels);
    
    // Create chart with improved configuration
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderColor: colors.map(color => adjustColorBrightness(color, -0.2)),
                borderWidth: 1,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 15,
                        font: {
                            size: 14
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const formattedValue = value.toFixed(1);
                            return `${label}: ${formattedValue}% (${calculateTimeFromPercentage(value)})`; 
                        }
                    }
                }
            }
        }
    });
}

// Create eye contact chart
function createEyeContactChart() {
    const ctx = document.getElementById('eye-contact-chart').getContext('2d');
    
    // Calculate eye contact distribution
    const eyeContactData = [
        eyeContactPercentage, 
        100 - eyeContactPercentage
    ];
    
    // Create chart
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Eye Contact', 'No Eye Contact'],
            datasets: [{
                data: eyeContactData,
                backgroundColor: [
                    '#10b981', // Green for eye contact
                    '#d1d5db'  // Light gray for no eye contact
                ],
                borderColor: [
                    '#059669', // Darker green border
                    '#9ca3af'  // Darker gray border
                ],
                borderWidth: 1,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 14
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const formattedValue = value.toFixed(1);
                            return `${label}: ${formattedValue}% (${calculateTimeFromPercentage(value)})`;
                        }
                    }
                }
            }
        }
    });
}

// New chart to show engagement timeline
function createEngagementTimelineChart() {
    // Check if the element exists
    const timelineCanvas = document.getElementById('engagement-timeline-chart');
    if (!timelineCanvas) return;
    
    const ctx = timelineCanvas.getContext('2d');
    
    // For this demo, we'll generate mock timeline data
    // In a real implementation, this would come from the server
    const timeLabels = generateTimeLabels();
    const emotionIntensity = generateMockEmotionTimeline();
    const eyeContactTimeline = generateMockEyeContactTimeline();
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [
                {
                    label: 'Emotional Engagement',
                    data: emotionIntensity,
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'Eye Contact',
                    data: eyeContactTimeline,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.1,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Time'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Emotional Engagement'
                    },
                    min: 0,
                    max: 1
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Eye Contact'
                    },
                    min: 0,
                    max: 1,
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

// Generate colors for each emotion
function generateColorsForEmotions(emotions) {
    // Enhanced color palette for better visibility
    const emotionColors = {
        'neutral': '#6b7280',   // Gray
        'happy': '#10b981',     // Green
        'sad': '#3b82f6',       // Blue
        'angry': '#ef4444',     // Red
        'fearful': '#8b5cf6',   // Purple
        'disgusted': '#f59e0b', // Orange
        'surprised': '#ec4899'  // Pink
    };
    
    // Return colors for each emotion with fallback
    return emotions.map(emotion => emotionColors[emotion] || '#6b7280');
}

// Adjust color brightness for borders
function adjustColorBrightness(hex, factor) {
    // Convert hex to RGB
    let r = parseInt(hex.substring(1, 3), 16);
    let g = parseInt(hex.substring(3, 5), 16);
    let b = parseInt(hex.substring(5, 7), 16);
    
    // Adjust brightness
    r = Math.round(r * (1 + factor));
    g = Math.round(g * (1 + factor));
    b = Math.round(b * (1 + factor));
    
    // Ensure values are in valid range
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    
    // Convert back to hex
    return `#${(r.toString(16).padStart(2, '0'))}${(g.toString(16).padStart(2, '0'))}${(b.toString(16).padStart(2, '0'))}`;
}

// Calculate time string from percentage
function calculateTimeFromPercentage(percentage) {
    // Get totalDuration safely - use a default value if not defined
    const totalSeconds = window.totalDuration || 300; // Default to 5 minutes
    
    // Calculate seconds based on total duration and percentage
    const seconds = Math.round(totalSeconds * (percentage / 100));
    
    // Format as mm:ss
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Generate time labels for timeline chart (mock data for demo)
function generateTimeLabels() {
    const labels = [];
    const steps = 10;
    
    for (let i = 0; i <= steps; i++) {
        const percentage = (i / steps) * 100;
        labels.push(calculateTimeFromPercentage(percentage));
    }
    
    return labels;
}

// Generate mock emotion timeline data for demo
function generateMockEmotionTimeline() {
    const data = [];
    const steps = 10;
    
    for (let i = 0; i <= steps; i++) {
        // Create a reasonably realistic emotion intensity curve
        const base = 0.5;
        const variance = Math.sin(i * (Math.PI / steps) * 2) * 0.3;
        const random = (Math.random() - 0.5) * 0.1;
        
        data.push(Math.max(0, Math.min(1, base + variance + random)));
    }
    
    return data;
}

// Generate mock eye contact timeline for demo
function generateMockEyeContactTimeline() {
    const data = [];
    const steps = 10;
    // Make sure eyeContactPercentage is defined
    const eyeContactRate = (typeof eyeContactPercentage !== 'undefined' ? eyeContactPercentage : 50) / 100;
    
    for (let i = 0; i <= steps; i++) {
        // Eye contact is more binary (either looking or not)
        // But we'll add some transition smoothing for visualization
        const baseProb = eyeContactRate;
        const random = Math.random();
        
        // Create a value that tends to cluster around either 0 or 1
        let value;
        if (random < baseProb) {
            value = 0.8 + (Math.random() * 0.2); // Looking at camera
        } else {
            value = Math.random() * 0.3; // Not looking at camera
        }
        
        data.push(value);
    }
    
    return data;
}

// Download report as PDF (placeholder implementation)
function downloadReport() {
    alert('In a full implementation, this would generate a PDF report of your call analytics.');
    
    // In a real implementation, you would use a library like jsPDF to generate a PDF
    // Example implementation:
    /*
    import { jsPDF } from "jspdf";
    
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(22);
    doc.text("Video Call Analysis Report", 105, 20, { align: "center" });
    
    // Add date
    doc.setFontSize(12);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 105, 30, { align: "center" });
    
    // Add emotion data
    doc.setFontSize(16);
    doc.text("Emotion Distribution", 20, 50);
    
    // Get canvas image
    const emotionsCanvas = document.getElementById('emotions-chart');
    const emotionsImage = emotionsCanvas.toDataURL('image/png');
    doc.addImage(emotionsImage, 'PNG', 20, 60, 170, 80);
    
    // Add eye contact data
    doc.text("Eye Contact Analysis", 20, 150);
    
    const eyeContactCanvas = document.getElementById('eye-contact-chart');
    const eyeContactImage = eyeContactCanvas.toDataURL('image/png');
    doc.addImage(eyeContactImage, 'PNG', 20, 160, 170, 80);
    
    // Add engagement timeline
    doc.addPage();
    doc.text("Engagement Timeline", 20, 20);
    
    const timelineCanvas = document.getElementById('engagement-timeline-chart');
    const timelineImage = timelineCanvas.toDataURL('image/png');
    doc.addImage(timelineImage, 'PNG', 20, 30, 170, 80);
    
    // Add recommendations
    doc.text("Recommendations", 20, 130);
    
    // Add recommendations text
    const recommendations = document.querySelector('.report-recommendations').textContent;
    doc.setFontSize(10);
    doc.text(recommendations, 20, 140, { maxWidth: 170 });
    
    // Save PDF
    doc.save("call_analysis_report.pdf");
    */
}