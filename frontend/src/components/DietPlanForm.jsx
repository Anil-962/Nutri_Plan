import React, { useState } from 'react';

function DietPlanForm({ initialData, onSubmit, loading, onBack }) {
  const [formData, setFormData] = useState(initialData);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 style={{marginBottom: '1.5rem', textAlign: 'center'}}>Step 2: Diet Preferences</h2>

      <div className="form-group">
        <label>Activity Level</label>
        <select name="activity_level" value={formData.activity_level} onChange={handleChange}>
          <option value="Sedentary">Sedentary (Little or no exercise)</option>
          <option value="Moderate">Moderate (Exercise 3-5 days/week)</option>
          <option value="Active">Active (Exercise 6-7 days/week)</option>
        </select>
      </div>

      <div className="form-group">
        <label>Dietary Goal</label>
        <select name="dietary_goal" value={formData.dietary_goal} onChange={handleChange}>
          <option value="Lose Weight">Lose Weight</option>
          <option value="Maintain">Maintain Weight</option>
          <option value="Gain Muscle">Gain Muscle</option>
        </select>
      </div>

      <div className="form-group">
        <label>Dietary Type</label>
        <select name="dietary_type" value={formData.dietary_type} onChange={handleChange}>
          <option value="Omnivore">Omnivore (Anything)</option>
          <option value="Vegetarian">Vegetarian</option>
          <option value="Vegan">Vegan</option>
          <option value="Keto">Keto (Low Carb, High Fat)</option>
        </select>
      </div>

      <div className="form-group">
        <label>Dietary Restrictions (Optional)</label>
        <input 
          type="text" 
          name="dietary_restrictions" 
          value={formData.dietary_restrictions || ''} 
          onChange={handleChange} 
          placeholder="e.g. no dairy, gluten-free, halal" 
        />
      </div>

      <div className="flex-row" style={{marginTop: '2rem'}}>
        <button type="button" onClick={onBack} className="btn btn-secondary" disabled={loading}>Back</button>
        <button type="submit" className="btn" disabled={loading}>
          {loading ? 'Generating Plan...' : 'Generate My Plan'}
        </button>
      </div>
    </form>
  );
}

export default DietPlanForm;
