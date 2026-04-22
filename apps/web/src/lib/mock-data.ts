export interface Patient {
  id: string;
  name: string;
  email: string;
  cpf: string;
  phone: string;
  birthDate: string;
  chronoAge: number;
  bioAge: number;
  gender: string;
  status: 'active' | 'inactive';
  lastConsultation: string;
  gutHealthScore: number;
  sleepQuality: number;
  inflammatoryMarkers: { date: string; value: number }[];
}

export const patients: Patient[] = [
  {
    id: '1',
    name: 'Ana Silva Santos',
    email: 'ana.silva@email.com.br',
    cpf: '123.456.789-00',
    phone: '(11) 98765-4321',
    birthDate: '1985-05-15',
    chronoAge: 39,
    bioAge: 34,
    gender: 'Female',
    status: 'active',
    lastConsultation: '2024-03-10',
    gutHealthScore: 85,
    sleepQuality: 70,
    inflammatoryMarkers: [
      { date: '2023-10-01', value: 5.2 },
      { date: '2023-12-15', value: 4.8 },
      { date: '2024-02-20', value: 3.1 },
    ]
  },
  {
    id: '2',
    name: 'Carlos Eduardo Souza',
    email: 'carlos.ed@gmail.com',
    cpf: '987.654.321-11',
    phone: '(21) 99988-7766',
    birthDate: '1972-11-20',
    chronoAge: 51,
    bioAge: 58,
    gender: 'Male',
    status: 'active',
    lastConsultation: '2024-03-15',
    gutHealthScore: 45,
    sleepQuality: 40,
    inflammatoryMarkers: [
      { date: '2023-11-05', value: 8.5 },
      { date: '2024-01-10', value: 9.1 },
      { date: '2024-03-15', value: 7.8 },
    ]
  },
  {
    id: '3',
    name: 'Mariana Oliveira',
    email: 'mari.oliveira@uol.com.br',
    cpf: '456.123.789-22',
    phone: '(31) 97766-5544',
    birthDate: '1992-02-10',
    chronoAge: 32,
    bioAge: 30,
    gender: 'Female',
    status: 'active',
    lastConsultation: '2024-03-18',
    gutHealthScore: 92,
    sleepQuality: 85,
    inflammatoryMarkers: [
      { date: '2024-01-20', value: 2.1 },
      { date: '2024-03-18', value: 1.8 },
    ]
  }
];

export const appointments = [
  { id: '1', patientId: '1', time: '09:00', date: '2024-05-20', status: 'Scheduled', type: 'Initial Consultation' },
  { id: '2', patientId: '2', time: '11:30', date: '2024-05-20', status: 'Confirmed', type: 'Follow-up' },
  { id: '3', patientId: '3', time: '14:00', date: '2024-05-21', status: 'Scheduled', type: 'Protocol Review' },
];

export const financialData = {
  monthlyRevenue: 24500,
  pendingPayments: 3200,
  cashFlow: [
    { name: 'Jan', value: 18000 },
    { name: 'Feb', value: 21000 },
    { name: 'Mar', value: 24500 },
    { name: 'Apr', value: 19500 },
  ]
};