document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const readingForm = document.getElementById('readingForm');
    const readingDateInput = document.getElementById('readingDate');
    const readingValueInput = document.getElementById('readingValue');
    const readingsTableBody = document.getElementById('readingsTableBody');
    const noDataMessage = document.getElementById('noDataMessage');

    const waterPriceInput = document.getElementById('waterPrice');
    const exportDataBtn = document.getElementById('exportDataBtn');
    const importDataBtn = document.getElementById('importDataBtn');
    const importFile = document.getElementById('importFile');

    const summaryCard = document.getElementById('summaryCard');
    const totalConsumptionEl = document.getElementById('totalConsumption');
    const totalCostEl = document.getElementById('totalCost');
    const averageDailyConsumptionEl = document.getElementById('averageDailyConsumption');
    const averageDailyCostEl = document.getElementById('averageDailyCost');

    const predictionsCard = document.getElementById('predictionsCard');
    const pred7DaysConsumption = document.getElementById('pred7DaysConsumption');
    const pred7DaysCost = document.getElementById('pred7DaysCost');
    const pred30DaysConsumption = document.getElementById('pred30DaysConsumption');
    const pred30DaysCost = document.getElementById('pred30DaysCost');
    const pred365DaysConsumption = document.getElementById('pred365DaysConsumption');
    const pred365DaysCost = document.getElementById('pred365DaysCost');

    // --- State Variables ---
    let readings = [];
    let waterPrice = 0;

    // --- Load Data ---
    function loadData() {
        readings = JSON.parse(localStorage.getItem('waterReadings')) || [];
        waterPrice = parseFloat(localStorage.getItem('waterPricePerM3')) || 0;
        waterPriceInput.value = waterPrice > 0 ? waterPrice.toFixed(2) : '';
        renderAll();
    }

    // --- Save Data ---
    function saveData() {
        localStorage.setItem('waterReadings', JSON.stringify(readings));
        localStorage.setItem('waterPricePerM3', waterPrice.toString());
    }

    // --- Process and Render ---
    function processAndCalculate() {
        readings.sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort by date

        for (let i = 0; i < readings.length; i++) {
            if (i === 0) {
                readings[i].consumption = null;
                readings[i].cost = null;
                readings[i].daysSincePrevious = null;
            } else {
                const prevReading = readings[i-1];
                const currentDate = new Date(readings[i].date);
                const prevDate = new Date(prevReading.date);
                
                const consumption = (readings[i].value - prevReading.value);
                readings[i].consumption = consumption.toFixed(3);

                const timeDiff = currentDate.getTime() - prevDate.getTime();
                const daysDiff = Math.max(1, Math.ceil(timeDiff / (1000 * 3600 * 24))); // Ensure at least 1 day
                readings[i].daysSincePrevious = daysDiff;
                
                readings[i].cost = waterPrice > 0 ? (consumption * waterPrice).toFixed(2) : null;
            }
        }
    }

    function renderReadingsTable() {
        readingsTableBody.innerHTML = '';
        if (readings.length === 0) {
            noDataMessage.classList.remove('hidden');
            summaryCard.classList.add('hidden');
            predictionsCard.classList.add('hidden');
            return;
        }

        noDataMessage.classList.add('hidden');
        summaryCard.classList.remove('hidden');
        if (readings.length >=2) predictionsCard.classList.remove('hidden');


        readings.forEach((reading, index) => {
            const row = readingsTableBody.insertRow();
            row.insertCell().textContent = new Date(reading.date).toLocaleDateString('fr-FR');
            row.insertCell().textContent = parseFloat(reading.value).toFixed(3);
            row.insertCell().textContent = reading.consumption !== null ? parseFloat(reading.consumption).toFixed(3) : 'N/A';
            row.insertCell().textContent = reading.cost !== null ? parseFloat(reading.cost).toFixed(2) + ' €' : 'N/A';

            const actionCell = row.insertCell();
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Supprimer';
            deleteButton.classList.add('delete-btn');
            deleteButton.onclick = () => deleteReading(index);
            actionCell.appendChild(deleteButton);
        });
    }

    function updateSummaryAndPredictions() {
        if (readings.length < 2) {
            totalConsumptionEl.textContent = 'N/A';
            totalCostEl.textContent = 'N/A';
            averageDailyConsumptionEl.textContent = 'N/A';
            averageDailyCostEl.textContent = 'N/A';
            summaryCard.classList.add('hidden');
            predictionsCard.classList.add('hidden');
            clearPredictions();
            return;
        }
        summaryCard.classList.remove('hidden');
        predictionsCard.classList.remove('hidden');

        let totalConsumption = 0;
        let totalCost = 0;
        let totalDays = 0;
        let validConsumptionPeriods = 0;

        for (let i = 1; i < readings.length; i++) {
            const consumption = parseFloat(readings[i].consumption);
            const cost = parseFloat(readings[i].cost);
            const days = readings[i].daysSincePrevious;

            if (!isNaN(consumption)) {
                totalConsumption += consumption;
                validConsumptionPeriods++;
            }
            if (!isNaN(cost) && waterPrice > 0) {
                totalCost += cost;
            }
            if (days) {
                totalDays += days;
            }
        }
        
        totalConsumptionEl.textContent = totalConsumption.toFixed(3);
        totalCostEl.textContent = waterPrice > 0 ? totalCost.toFixed(2) + ' €' : 'N/A (prix non défini)';

        if (totalDays > 0 && validConsumptionPeriods > 0) {
            const avgDailyConsumption = totalConsumption / totalDays;
            averageDailyConsumptionEl.textContent = avgDailyConsumption.toFixed(3) + ' m³/jour';
            
            if (waterPrice > 0) {
                const avgDailyCost = (totalConsumption * waterPrice) / totalDays;
                averageDailyCostEl.textContent = avgDailyCost.toFixed(2) + ' €/jour';
                updatePredictionsDisplay(avgDailyConsumption, avgDailyCost);
            } else {
                averageDailyCostEl.textContent = 'N/A (prix non défini)';
                clearPredictions();
            }
        } else {
            averageDailyConsumptionEl.textContent = 'N/A';
            averageDailyCostEl.textContent = 'N/A';
            clearPredictions();
        }
    }
    
    function clearPredictions() {
        pred7DaysConsumption.textContent = 'N/A';
        pred7DaysCost.textContent = 'N/A';
        pred30DaysConsumption.textContent = 'N/A';
        pred30DaysCost.textContent = 'N/A';
        pred365DaysConsumption.textContent = 'N/A';
        pred365DaysCost.textContent = 'N/A';
    }

    function updatePredictionsDisplay(avgDailyConsumption, avgDailyCost) {
        if (isNaN(avgDailyConsumption) || isNaN(avgDailyCost) || waterPrice <= 0) {
            clearPredictions();
            return;
        }
        pred7DaysConsumption.textContent = (avgDailyConsumption * 7).toFixed(3);
        pred7DaysCost.textContent = (avgDailyCost * 7).toFixed(2) + ' €';
        pred30DaysConsumption.textContent = (avgDailyConsumption * 30).toFixed(3);
        pred30DaysCost.textContent = (avgDailyCost * 30).toFixed(2) + ' €';
        pred365DaysConsumption.textContent = (avgDailyConsumption * 365).toFixed(3);
        pred365DaysCost.textContent = (avgDailyCost * 365).toFixed(2) + ' €';
    }


    function renderAll() {
        processAndCalculate();
        renderReadingsTable();
        updateSummaryAndPredictions();
    }

    // --- Event Handlers ---
    readingForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const date = readingDateInput.value;
        const value = readingValueInput.value;

        if (!date || !value) {
            alert('Veuillez remplir la date et la valeur du compteur.');
            return;
        }
        if (parseFloat(value) < 0) {
            alert('La valeur du compteur ne peut pas être négative.');
            return;
        }
        // Check if a reading for this date already exists
        const existingReadingIndex = readings.findIndex(r => r.date === date);
        if (existingReadingIndex > -1) {
             if(confirm("Un relevé existe déjà pour cette date. Voulez-vous le remplacer ?")) {
                readings[existingReadingIndex].value = parseFloat(value);
             } else {
                return; // Do nothing if user cancels
             }
        } else {
            readings.push({ date, value: parseFloat(value), consumption: null, cost: null, daysSincePrevious: null });
        }
        
        saveData();
        renderAll();
        readingForm.reset();
        readingDateInput.value = new Date().toISOString().split('T')[0]; // Reset date to today
        readingDateInput.focus();
    });

    function deleteReading(index) {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce relevé ?')) {
            readings.splice(index, 1);
            saveData();
            renderAll();
        }
    }
    // Attach deleteReading to window object if you need to call it from HTML (not needed here as we add listeners dynamically)
    // window.deleteReading = deleteReading; 

    waterPriceInput.addEventListener('change', (event) => {
        const newPrice = parseFloat(event.target.value);
        waterPrice = newPrice >= 0 ? newPrice : 0;
        waterPriceInput.value = waterPrice > 0 ? waterPrice.toFixed(2) : ''; // Format or clear if zero/invalid
        saveData();
        renderAll(); // Recalculate costs
    });

    exportDataBtn.addEventListener('click', () => {
        if (readings.length === 0) {
            alert("Aucune donnée à exporter.");
            return;
        }
        const dataToExport = {
            waterPrice: waterPrice,
            readings: readings
        };
        const dataStr = JSON.stringify(dataToExport, null, 2); // null, 2 for pretty print
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = 'consommation_eau_backup.json';
        
        let linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        linkElement.remove();
    });

    importDataBtn.addEventListener('click', () => {
        importFile.click(); // Trigger file input click
    });

    importFile.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (importedData && Array.isArray(importedData.readings)) {
                    if (confirm("Importer ces données remplacera les données actuelles. Continuer ?")) {
                        readings = importedData.readings;
                        waterPrice = parseFloat(importedData.waterPrice) || 0;
                        waterPriceInput.value = waterPrice > 0 ? waterPrice.toFixed(2) : '';
                        saveData();
                        renderAll();
                        alert("Données importées avec succès !");
                    }
                } else {
                    alert("Format de fichier invalide. Le fichier doit contenir un objet avec une propriété 'readings' (tableau) et 'waterPrice'.");
                }
            } catch (error) {
                alert("Erreur lors de la lecture du fichier : " + error.message);
            } finally {
                 importFile.value = ''; // Reset file input for next import
            }
        };
        reader.readAsText(file);
    });


    // --- Initial Load ---
    loadData();
    readingDateInput.value = new Date().toISOString().split('T')[0]; // Set default date to today
});