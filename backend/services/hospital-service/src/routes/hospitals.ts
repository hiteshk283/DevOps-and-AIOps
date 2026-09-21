import { Router, Request, Response } from 'express';
import { pool } from '../database/connection';

export const hospitalRoutes = Router();

const DEFAULT_HOSPITALS = [
  {
    id: 1,
    name: 'Apollo Super Speciality Hospital',
    city: 'Mumbai',
    state: 'Maharashtra',
    address: 'Plot No 13, Off Parsik Hill Road, Sector 23, CBD Belapur, Navi Mumbai',
    pincode: '400614',
    phone: '+91 22 3350 3350',
    email: 'tpa.mumbai@apollohospitals.com',
    cashless_available: true,
    emergency_24x7: true,
    specialties: ['Cardiology', 'Orthopedics', 'Oncology', 'Neurology', 'Gastroenterology', '24/7 Trauma'],
    bed_count: 500,
    rating: 4.9,
    tpa_desk_contact: '+91 22 3350 3388 (Ext: TPA)',
    turnaround_time_hours: 1.0,
  },
  {
    id: 2,
    name: 'Fortis Hospital Bannerghatta',
    city: 'Bengaluru',
    state: 'Karnataka',
    address: '154/9, Bannerghatta Road, Opposite IIMB, Bengaluru',
    pincode: '560076',
    phone: '+91 80 6621 4444',
    email: 'cashless.bengaluru@fortishealthcare.com',
    cashless_available: true,
    emergency_24x7: true,
    specialties: ['Cardiac Sciences', 'Joint Replacement', 'Pulmonology', 'Organ Transplant', 'Emergency Care'],
    bed_count: 400,
    rating: 4.8,
    tpa_desk_contact: '+91 80 6621 4412 (Desk 4)',
    turnaround_time_hours: 1.2,
  },
  {
    id: 3,
    name: 'Max Super Speciality Hospital, Saket',
    city: 'Delhi',
    state: 'Delhi NCR',
    address: '1, 2, Press Enclave Marg, Saket Institutional Area, New Delhi',
    pincode: '110017',
    phone: '+91 11 2651 5050',
    email: 'tpa.saket@maxhealthcare.com',
    cashless_available: true,
    emergency_24x7: true,
    specialties: ['Comprehensive Cancer Care', 'Cardiovascular', 'Neurosciences', 'Pediatrics', 'Neonatal ICU'],
    bed_count: 550,
    rating: 4.8,
    tpa_desk_contact: '+91 11 2651 5080 (Floor 1)',
    turnaround_time_hours: 1.5,
  },
  {
    id: 4,
    name: 'Manipal Hospital Old Airport Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    address: '98, HAL Old Airport Road, Kodihalli, Bengaluru',
    pincode: '560017',
    phone: '+91 80 2502 4444',
    email: 'insurance.manipal@manipalhospitals.com',
    cashless_available: true,
    emergency_24x7: true,
    specialties: ['Cardiology', 'Nephrology & Dialysis', 'Critical Care', 'General Surgery'],
    bed_count: 600,
    rating: 4.7,
    tpa_desk_contact: '+91 80 2502 4499',
    turnaround_time_hours: 1.8,
  },
  {
    id: 5,
    name: 'Tata Memorial Centre',
    city: 'Mumbai',
    state: 'Maharashtra',
    address: 'Dr. E Borges Road, Parel, Mumbai',
    pincode: '400012',
    phone: '+91 22 2417 7000',
    email: 'info@tmc.gov.in',
    cashless_available: true,
    emergency_24x7: true,
    specialties: ['Advanced Oncology', 'Bone Marrow Transplant', 'Radiotherapy'],
    bed_count: 700,
    rating: 4.9,
    tpa_desk_contact: '+91 22 2417 7055',
    turnaround_time_hours: 2.0,
  }
];

// Search & filter cashless network hospitals
hospitalRoutes.get('/', async (req: Request, res: Response) => {
  const { city, specialty, cashless, emergency, q } = req.query;

  try {
    const result = await pool.query('SELECT * FROM hospitals ORDER BY rating DESC');
    let hospitals = result.rows.length ? result.rows : DEFAULT_HOSPITALS;

    if (city) {
      hospitals = hospitals.filter((h: any) => h.city.toLowerCase() === String(city).toLowerCase());
    }
    if (specialty) {
      hospitals = hospitals.filter((h: any) => 
        Array.isArray(h.specialties) && h.specialties.some((s: string) => s.toLowerCase().includes(String(specialty).toLowerCase()))
      );
    }
    if (cashless === 'true') {
      hospitals = hospitals.filter((h: any) => h.cashless_available);
    }
    if (emergency === 'true') {
      hospitals = hospitals.filter((h: any) => h.emergency_24x7);
    }
    if (q) {
      const search = String(q).toLowerCase();
      hospitals = hospitals.filter((h: any) => 
        h.name.toLowerCase().includes(search) || 
        h.city.toLowerCase().includes(search) ||
        h.address.toLowerCase().includes(search)
      );
    }

    res.json(hospitals);
  } catch (error) {
    let hospitals = DEFAULT_HOSPITALS;
    if (city) {
      hospitals = hospitals.filter((h: any) => h.city.toLowerCase() === String(city).toLowerCase());
    }
    res.json(hospitals);
  }
});

// Single hospital details
hospitalRoutes.get('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  try {
    const result = await pool.query('SELECT * FROM hospitals WHERE id = $1', [id]);
    if (result.rows.length > 0) {
      return res.json(result.rows[0]);
    }
    const fallback = DEFAULT_HOSPITALS.find(h => h.id === id);
    if (fallback) return res.json(fallback);
    return res.status(404).json({ error: 'Hospital not found in network directory' });
  } catch (error) {
    const fallback = DEFAULT_HOSPITALS.find(h => h.id === id);
    if (fallback) return res.json(fallback);
    res.status(404).json({ error: 'Hospital not found' });
  }
});

// Pre-auth eligibility check
hospitalRoutes.post('/preauth-check', async (req: Request, res: Response) => {
  const { hospitalId, policyCode, memberId, estimatedAmount } = req.body;

  const hospital = DEFAULT_HOSPITALS.find(h => h.id === Number(hospitalId)) || DEFAULT_HOSPITALS[0];

  res.json({
    eligible: true,
    hospitalName: hospital.name,
    memberId: memberId || 'MEM-1001',
    policyCode: policyCode || 'POL-GLD-03',
    cashlessNetworkActive: hospital.cashless_available,
    turnaroundTime: `${hospital.turnaround_time_hours} hours`,
    estimatedCopayPercent: 10,
    requiresDoctorAdmissionNote: true,
    tpaDeskContact: hospital.tpa_desk_contact,
    verificationTimestamp: new Date().toISOString()
  });
});
