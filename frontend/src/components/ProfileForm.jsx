import React, { useState } from 'react';

function ProfileForm({ initialData, onSubmit }) {
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
      <h2 style={{marginBottom: '1.5rem', textAlign: 'center'}}>Step 1: Your Profile</h2>
      
      <div className="form-group">
        <label>Name</label>
        <input required type="text" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Alex" />
      </div>

      <div className="flex-row">
        <div className="form-group">
          <label>Age</label>
          <input required type="number" name="age" min="10" max="120" value={formData.age} onChange={handleChange} placeholder="Years" />
        </div>
        <div className="form-group">
          <label>Gender</label>
          <select name="gender" value={formData.gender} onChange={handleChange}>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
      </div>

      <div className="flex-row">
        <div className="form-group">
          <label>Weight (kg)</label>
          <input required type="number" step="0.1" name="weight" min="20" max="300" value={formData.weight} onChange={handleChange} placeholder="kg" />
        </div>
        <div className="form-group">
          <label>Height (cm)</label>
          <input required type="number" name="height" min="100" max="250" value={formData.height} onChange={handleChange} placeholder="cm" />
        </div>
      </div>

      <button type="submit" className="btn" style={{marginTop: '1rem'}}>Next Step</button>
    </form>
  );
}

export default ProfileForm;
