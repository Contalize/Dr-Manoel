"use client"

import { 
  Users, 
  CalendarCheck, 
  TrendingUp, 
  PlusCircle, 
  FileText, 
  Clock,
  ShieldCheck
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { appointments, financialData, patients } from "@/lib/mock-data";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const healthTrends = [
  { month: 'Jan', inflammatory: 6.2, sleep: 65 },
  { month: 'Feb', inflammatory: 5.8, sleep: 68 },
  { month: 'Mar', inflammatory: 4.5, sleep: 72 },
  { month: 'Apr', inflammatory: 4.1, sleep: 75 },
];

export default function Dashboard() {
  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline">Welcome back, Dr. Dupont</h1>
          <p className="text-muted-foreground">Your clinic overview for today, May 20th, 2024.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2 border-primary/20 text-primary hover:bg-primary hover:text-white transition-all">
            <Clock className="h-4 w-4" /> Schedule
          </Button>
          <Button className="gap-2 bg-accent text-white hover:bg-accent/90 shadow-lg">
            <PlusCircle className="h-4 w-4" /> New Patient
          </Button>
        </div>
      </header>

      {/* Quick Action Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Patients" 
          value={patients.length} 
          icon={Users} 
          trend={{ value: "12%", positive: true }} 
        />
        <StatCard 
          title="Appointments Today" 
          value={appointments.filter(a => a.date === '2024-05-20').length} 
          icon={CalendarCheck} 
        />
        <StatCard 
          title="Revenue (May)" 
          value={`R$ ${financialData.monthlyRevenue.toLocaleString()}`} 
          icon={TrendingUp} 
          trend={{ value: "8%", positive: true }} 
        />
        <Card className="bg-primary text-primary-foreground border-none shadow-md overflow-hidden flex flex-col justify-center">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center gap-2">
              <ShieldCheck className="h-10 w-10 text-accent mb-2" />
              <p className="text-xs uppercase font-bold tracking-widest text-primary-foreground/70">LGPD Compliance</p>
              <h3 className="text-lg font-bold leading-tight">Strict Privacy Mode Active</h3>
              <Badge variant="secondary" className="mt-1 bg-white/20 text-white border-none">Secure</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Charts Section */}
        <Card className="lg:col-span-2 border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-primary font-headline">Clinical Performance Trends</CardTitle>
            <CardDescription>Average patient inflammatory markers vs. sleep quality improvements.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={healthTrends}>
                  <defs>
                    <linearGradient id="colorInflammatory" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2D5A27" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#2D5A27" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSleep" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="inflammatory" 
                    stroke="#2D5A27" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorInflammatory)" 
                    name="Inflammatory Marker (CRP)"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="sleep" 
                    stroke="#D4AF37" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorSleep)" 
                    name="Sleep Quality Index"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Schedule */}
        <Card className="border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-primary font-headline">Today's Schedule</CardTitle>
              <CardDescription>Your appointments for today.</CardDescription>
            </div>
            <Link href="/calendar">
              <Button variant="ghost" size="sm" className="text-accent hover:text-accent/80 hover:bg-accent/10">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {appointments.filter(a => a.date === '2024-05-20').map((appointment) => {
                const patient = patients.find(p => p.id === appointment.patientId);
                return (
                  <div key={appointment.id} className="flex items-start gap-4 p-3 rounded-xl hover:bg-secondary transition-colors cursor-pointer group">
                    <div className="bg-primary/5 p-3 rounded-lg text-primary font-bold text-center min-w-[60px] group-hover:bg-primary group-hover:text-white transition-colors">
                      <span className="text-xs uppercase block font-medium opacity-70">Time</span>
                      {appointment.time}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-sm text-foreground">{patient?.name}</h4>
                      <p className="text-xs text-muted-foreground mb-2">{appointment.type}</p>
                      <Badge variant="outline" className={cn(
                        "text-[10px] uppercase font-bold px-1.5 py-0",
                        appointment.status === 'Confirmed' ? "text-green-600 border-green-600/20" : "text-amber-600 border-amber-600/20"
                      )}>
                        {appointment.status}
                      </Badge>
                    </div>
                    <PlusCircle className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                );
              })}
            </div>
            <Button className="w-full mt-6 bg-secondary text-primary hover:bg-primary hover:text-white border-none shadow-none font-semibold">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Appointment
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/anamnesis" className="contents">
          <Card className="group cursor-pointer hover:shadow-lg transition-all border-none bg-white">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="bg-accent/10 p-4 rounded-full group-hover:bg-accent group-hover:scale-110 transition-all">
                <PlusCircle className="h-6 w-6 text-accent group-hover:text-white" />
              </div>
              <div>
                <h3 className="font-bold text-primary">New Anamnesis</h3>
                <p className="text-xs text-muted-foreground">Start a new patient assessment</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/planner" className="contents">
          <Card className="group cursor-pointer hover:shadow-lg transition-all border-none bg-white">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="bg-primary/10 p-4 rounded-full group-hover:bg-primary group-hover:scale-110 transition-all">
                <FileText className="h-6 w-6 text-primary group-hover:text-white" />
              </div>
              <div>
                <h3 className="font-bold text-primary">Quick Prescription</h3>
                <p className="text-xs text-muted-foreground">Issue a pharmaceutical document</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/patients" className="contents">
          <Card className="group cursor-pointer hover:shadow-lg transition-all border-none bg-white">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="bg-blue-500/10 p-4 rounded-full group-hover:bg-blue-500 group-hover:scale-110 transition-all">
                <Users className="h-6 w-6 text-blue-500 group-hover:text-white" />
              </div>
              <div>
                <h3 className="font-bold text-primary">Patient Registry</h3>
                <p className="text-xs text-muted-foreground">Browse all clinical profiles</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}