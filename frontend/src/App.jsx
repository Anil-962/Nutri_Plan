import React, { useState, useEffect } from 'react';
import ProfileForm from './components/ProfileForm';
import DietPlanForm from './components/DietPlanForm';
import ResultsGrid from './components/ResultsGrid';
import SmartCoach from './components/SmartCoach';

function App() {
  const [step, setStep] = useState(1);
  const [profileData, setProfileData] = useState({
    name: '', age: '', gender: 'Male', weight: '', height: '',
    activity_level: 'Moderate', dietary_goal: 'Maintain', dietary_type: 'Omnivore',
    dietary_restrictions: ''
  });
  
  const [planResult, setPlanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('nutriplan_result');
    if (saved) {
      try {
        setPlanResult(JSON.parse(saved));
        setStep(3);
      } catch (e) {
        console.error("Error loading saved plan", e);
      }
    }
  }, []);

  const handleProfileSubmit = (data) => {
    setProfileData(prev => ({ ...prev, ...data }));
    setStep(2);
  };

  const handleDietSubmit = async (data) => {
    const finalData = { ...profileData, ...data };
    setProfileData(finalData);
    await generatePlan(finalData);
  };

  const generatePlan = async (dataToSubmit) => {
    setLoading(true);
    setError(null);

    // Convert strings to numbers for API
    const payload = {
      ...dataToSubmit,
      age: parseInt(dataToSubmit.age),
      weight: parseFloat(dataToSubmit.weight),
      height: parseFloat(dataToSubmit.height)
    };

    try {
      const res = await fetch('/api/generate_plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to generate plan');
      }

      const result = await res.json();
      setPlanResult(result);
      localStorage.setItem('nutriplan_result', JSON.stringify(result));
      setStep(3);
    } catch (err) {
      setError(err.message);
      setStep(2); // Stay on step 2 on error
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    await generatePlan(profileData);
  };

  const restartPlan = () => {
    setStep(1);
    // Note: Not clearing profileData so they can edit it easily
  };

  const content = (
    <>
      <div className="header">
        <h1>NutriPlan</h1>
        <p>Your personalized 7-day meal plan powered by AI</p>
      </div>

      <div className="steps-indicator">
        <div className={`step-dot ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}></div>
        <div className={`step-dot ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}></div>
        <div className={`step-dot ${step === 3 ? 'active' : ''}`}></div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="card">
        {step === 1 && (
          <ProfileForm 
            initialData={profileData} 
            onSubmit={handleProfileSubmit} 
          />
        )}
        
        {step === 2 && (
          <DietPlanForm 
            initialData={profileData}
            onSubmit={handleDietSubmit}
            loading={loading}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && planResult && (
          <ResultsGrid 
            result={planResult} 
            onRestart={restartPlan}
            onRegenerate={handleRegenerate}
            loading={loading}
          />
        )}
      </div>
    </>
  );

  return (
    <div className={step === 3 ? "app-layout" : "app-container"}>
      <div className="main-content">
        {content}
      </div>
      {step === 3 && planResult && (
        <div className="sidebar">
          <SmartCoach profileData={profileData} planResult={planResult} />
        </div>
      )}
    </div>
  );
}

export default App;
