import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

function ResultsGrid({ result, onRestart, onRegenerate, loading }) {
  const [openDay, setOpenDay] = useState(1);
  const [visibleDays, setVisibleDays] = useState(3);
  const [showInfo, setShowInfo] = useState(false);
  const pdfRef = useRef();

  const { nutrition, meal_plan } = result;

  const handleDownloadPDF = async () => {
    const element = pdfRef.current;
    if (!element) return;
    
    // Temporarily expand all days for PDF
    const oldVisible = visibleDays;
    const oldOpen = openDay;
    setVisibleDays(7);
    setOpenDay(null);
    
    // Slight delay to allow DOM to update before snapshot
    setTimeout(async () => {
      const canvas = await html2canvas(element, { scale: 1.5 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('NutriPlan.pdf');
      
      // Restore state
      setVisibleDays(oldVisible);
      setOpenDay(oldOpen);
    }, 200);
  };

  const getProgressClass = (current, target) => {
    const ratio = current / target;
    if (ratio <= 1.05) return 'good';
    if (ratio <= 1.20) return 'warning';
    return 'danger';
  };

  return (
    <div>
      {/* Info Modal */}
      {showInfo && (
        <div className="modal-overlay" onClick={() => setShowInfo(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{marginBottom: '1rem'}}>How are calories calculated?</h3>
            <p style={{marginBottom: '1rem'}}>
              We use the <strong>Mifflin-St Jeor equation</strong>, which is widely considered the most accurate method to estimate Basal Metabolic Rate (BMR) based on your age, gender, height, and weight.
            </p>
            <p style={{marginBottom: '1rem'}}>
              Your BMR is then multiplied by an activity factor to determine your Total Daily Energy Expenditure (TDEE). 
              Finally, we adjust the calories based on your goal (e.g., subtracting 500 kcal for weight loss).
            </p>
            <button className="btn btn-secondary" onClick={() => setShowInfo(false)}>Close</button>
          </div>
        </div>
      )}

      <div ref={pdfRef} style={{ padding: '10px' }}>
        <div className="results-header">
          <h2 style={{color: 'var(--primary)'}}>Your Plan is Ready!</h2>
          <p>
            Target: {nutrition.target_calories} kcal / day
            <span className="info-link" onClick={() => setShowInfo(true)}>(How is this calculated?)</span>
          </p>
          
          <div className="macros-bar">
            <div className="macro-item">
              <div className="macro-label">Protein</div>
              <div className="macro-val">{nutrition.macros.protein_g}g</div>
            </div>
            <div className="macro-item">
              <div className="macro-label">Carbs</div>
              <div className="macro-val">{nutrition.macros.carbs_g}g</div>
            </div>
            <div className="macro-item">
              <div className="macro-label">Fat</div>
              <div className="macro-val">{nutrition.macros.fat_g}g</div>
            </div>
          </div>
        </div>

        <div className="plan-grid">
          {meal_plan.slice(0, visibleDays).map((dayPlan) => (
            <div key={dayPlan.day} className="day-card">
              <div className="day-header" onClick={() => setOpenDay(openDay === dayPlan.day ? null : dayPlan.day)}>
                <span>Day {dayPlan.day}</span>
                <span style={{fontSize: '0.875rem', fontWeight: '400'}}>
                  {dayPlan.total_calories} kcal {openDay === dayPlan.day ? '▲' : '▼'}
                </span>
              </div>
              
              {/* Daily Progress Bars */}
              {dayPlan.daily_macros && (
                <div style={{padding: '0.5rem 1rem', display: 'flex', gap: '1rem', backgroundColor: '#fdfdfd', borderBottom: '1px solid var(--border)'}}>
                  <div style={{flex: 1}}>
                    <div style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>Cal: {dayPlan.total_calories} / {nutrition.target_calories}</div>
                    <div className="progress-container">
                      <div className={`progress-bar ${getProgressClass(dayPlan.total_calories, nutrition.target_calories)}`} style={{width: `${Math.min(100, (dayPlan.total_calories / nutrition.target_calories) * 100)}%`}}></div>
                    </div>
                  </div>
                  <div style={{flex: 1}}>
                    <div style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>Pro: {dayPlan.daily_macros.protein_g}g / {nutrition.macros.protein_g}g</div>
                    <div className="progress-container">
                      <div className={`progress-bar ${getProgressClass(dayPlan.daily_macros.protein_g, nutrition.macros.protein_g)}`} style={{width: `${Math.min(100, (dayPlan.daily_macros.protein_g / nutrition.macros.protein_g) * 100)}%`}}></div>
                    </div>
                  </div>
                </div>
              )}
              
              {(openDay === dayPlan.day || visibleDays === 7) && (
                <div className="day-content">
                  {dayPlan.meals.map((meal, idx) => (
                    <div key={idx} className="meal-item">
                      <div className="meal-header">
                        <span className="meal-type">{meal.type}</span>
                        <span className="meal-cal">{meal.calories} kcal</span>
                      </div>
                      <div className="meal-name">{meal.name}</div>
                      <div className="meal-prep">{meal.prep}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {visibleDays < meal_plan.length && (
        <button 
          className="btn btn-secondary" 
          style={{marginBottom: '1.5rem'}} 
          onClick={() => setVisibleDays(7)}
        >
          Show All 7 Days
        </button>
      )}

      <div className="flex-row">
        <button onClick={onRestart} className="btn btn-secondary">New Profile</button>
        <button onClick={onRegenerate} className="btn" disabled={loading}>
          {loading ? 'Regenerating...' : 'Regenerate Plan'}
        </button>
      </div>

      <button onClick={handleDownloadPDF} className="btn btn-secondary" style={{marginTop: '1rem', width: '100%'}}>
        Export as PDF
      </button>
    </div>
  );
}

export default ResultsGrid;
