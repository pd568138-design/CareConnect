import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Bell, CalendarDays, ClipboardList, HeartPulse, Hospital, LogOut, Menu, Search, ShieldCheck, Stethoscope, UserRound, Users, X } from 'lucide-react';
import { api, json } from './lib/api';

const today = new Date().toISOString().slice(0,10);
const periods = ['Morning','Afternoon','Evening'];
const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function App() {
  const [token,setToken] = useState(localStorage.getItem('cc_token') || '');
  const [user,setUser] = useState(JSON.parse(localStorage.getItem('cc_user') || 'null'));
  const [page,setPage] = useState('overview');
  const [notice,setNotice] = useState('');
  const [loading,setLoading] = useState(false);
  const [sidebarOpen,setSidebarOpen] = useState(false);
  const [notifications,setNotifications] = useState([]);
  const [hospitals,setHospitals] = useState([]);
  const [doctors,setDoctors] = useState([]);
  const [appointments,setAppointments] = useState([]);
  const [profile,setProfile] = useState({age:'',gender:'',address:''});
  const [location,setLocation] = useState(null);

  const notify = (msg) => { setNotice(msg); window.setTimeout(() => setNotice(''), 4500); };
  const logout = () => { localStorage.removeItem('cc_token'); localStorage.removeItem('cc_user'); setToken(''); setUser(null); setPage('overview'); };
  const refresh = async () => {
    if (!token || !user) return;
    try {
      const [h,d,a,n] = await Promise.all([
        api('hospitals'), api('doctors'), api(user.role === 'patient' ? 'appointments/mine' : user.role === 'doctor' ? 'appointments/doctor' : 'appointments/admin',{token}), api('notifications',{token})
      ]);
      setHospitals(h); setDoctors(d); setAppointments(a); setNotifications(n);
    } catch(e) { notify(e.message); }
  };
  useEffect(() => { if (token && user) refresh(); }, [token,user?.id]);
  useEffect(() => {
    if (!token || !user) return;
    const timer = window.setInterval(async () => {
      try {
        const n = await api('notifications', { token });
        setNotifications(n);
        if (user.role === 'doctor') setAppointments(await api('appointments/doctor', { token }));
        if (user.role === 'admin') setAppointments(await api('appointments/admin', { token }));
      } catch { /* Keep the current screen usable during temporary network interruptions. */ }
    }, 15000);
    return () => window.clearInterval(timer);
  }, [token,user?.id]);
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(p => setLocation({lat:p.coords.latitude,lng:p.coords.longitude}), () => {});
  }, []);

  const sortedHospitals = useMemo(() => {
    const distance = h => location && Number.isFinite(h.latitude) && Number.isFinite(h.longitude)
      ? haversine(location.lat,location.lng,h.latitude,h.longitude) : null;
    return [...hospitals].map(h => ({...h,distance:distance(h)})).sort((a,b) => {
      if (a.distance !== null && b.distance !== null) return a.distance-b.distance || b.rating-a.rating;
      return b.rating-a.rating;
    });
  },[hospitals,location]);

  if (!token || !user) return <AuthScreen onLogin={(t,u)=>{localStorage.setItem('cc_token',t);localStorage.setItem('cc_user',JSON.stringify(u));setToken(t);setUser(u);}} notify={notify} notice={notice}/>;

  const menus = user.role === 'patient'
    ? [{id:'overview',label:'Overview',icon:Activity},{id:'find',label:'Find hospitals',icon:Search},{id:'appointments',label:'My appointments',icon:CalendarDays},{id:'profile',label:'My health profile',icon:UserRound},{id:'notifications',label:'Notifications',icon:Bell}]
    : user.role === 'doctor'
    ? [{id:'overview',label:'Overview',icon:Activity},{id:'doctorAppointments',label:'Patient appointments',icon:CalendarDays},{id:'schedule',label:'Availability schedule',icon:ClipboardList},{id:'notifications',label:'Notifications',icon:Bell}]
    : [{id:'overview',label:'Overview',icon:Activity},{id:'adminHospital',label:'Hospital details',icon:Hospital},{id:'adminDoctors',label:'Manage doctors',icon:Stethoscope},{id:'adminBookings',label:'Bookings',icon:CalendarDays},{id:'notifications',label:'Notifications',icon:Bell}];

  const go = id => {setPage(id);setSidebarOpen(false);};
  const refreshAndNotify = async msg => { await refresh(); notify(msg); };

  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen?'open':''}`}>
      <div className="brand"><span className="brand-mark"><HeartPulse size={21}/></span><span>Care<span className="brand-light">Connect</span><small>HEALTHCARE, IN SYNC</small></span><button className="mobile-close" onClick={()=>setSidebarOpen(false)}><X/></button></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>{menus.map(m=><button key={m.id} className={`nav-item ${page===m.id?'active':''}`} onClick={()=>go(m.id)}><m.icon size={18}/><span>{m.label}</span>{m.id==='notifications'&&notifications.length>0&&<i className="nav-count">{notifications.length}</i>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="support-card"><ShieldCheck size={19}/><b>Your care, protected</b><p>Your information is handled through secure, role-based access.</p></div><button className="nav-item logout" onClick={logout}><LogOut size={18}/> Sign out</button></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><button className="menu-button" onClick={()=>setSidebarOpen(true)}><Menu/></button><div className="breadcrumb">CareConnect <span>/</span> {menus.find(m=>m.id===page)?.label || 'Workspace'}</div><div className="top-actions"><button className="icon-button" onClick={()=>go('notifications')} aria-label="Notifications"><Bell size={19}/>{notifications.length>0&&<i/>}</button><div className="user-chip"><div className="avatar">{user.name?.slice(0,1).toUpperCase()}</div><span><b>{user.name}</b><small>{user.role}</small></span></div></div></header>
      <div className="content">
        {page==='overview'&&<Overview user={user} appointments={appointments} hospitals={hospitals} doctors={doctors} go={go}/>}
        {page==='find'&&user.role==='patient'&&<FindHospitals hospitals={sortedHospitals} doctors={doctors} token={token} onBooked={()=>refreshAndNotify('Booking request submitted.')} notify={notify}/>}
        {page==='appointments'&&user.role==='patient'&&<PatientAppointments appointments={appointments} token={token} refresh={refresh}/>}
        {page==='profile'&&user.role==='patient'&&<PatientProfile user={user} token={token} notify={notify}/>}
        {page==='notifications'&&<Notifications items={notifications} refresh={refresh}/>}
        {page==='adminHospital'&&user.role==='admin'&&<AdminHospital hospitals={hospitals} token={token} refresh={refresh} notify={notify}/>}
        {page==='adminDoctors'&&user.role==='admin'&&<AdminDoctors hospitals={hospitals} token={token} refresh={refresh} notify={notify}/>}
        {page==='adminBookings'&&user.role==='admin'&&<AdminBookings appointments={appointments} token={token} refresh={refresh} notify={notify}/>}
        {page==='doctorAppointments'&&user.role==='doctor'&&<DoctorAppointments appointments={appointments} token={token} refresh={refresh} notify={notify}/>}
        {page==='schedule'&&user.role==='doctor'&&<DoctorSchedule token={token} notify={notify}/>}
      </div>
    </main>
    {notice&&<div className="toast"><span>•</span>{notice}</div>}
  </div>;
}

function haversine(lat1,lon1,lat2,lon2) {
  const r=6371, dLat=(lat2-lat1)*Math.PI/180,dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return 2*r*Math.asin(Math.sqrt(a));
}

function AuthScreen({onLogin,notify,notice}) {
  const [mode,setMode]=useState('login');
  const [form,setForm]=useState({name:'',email:'',phone:'',password:'',code:''});
  const [pending,setPending]=useState(false);
  const [busy,setBusy]=useState(false);
  const update=e=>setForm({...form,[e.target.name]:e.target.value});
  const submit=async e=>{
    e.preventDefault();setBusy(true);
    try {
      if(mode==='register'&&!pending) { const r=await api('auth/register',{method:'POST',body:json(form)});setPending(true);notify(r.message); }
      else if(mode==='register'&&pending) { const r=await api('auth/verify-otp',{method:'POST',body:json({phone:form.phone,code:form.code})});onLogin(r.token,r.user); }
      else { const r=await api('auth/login',{method:'POST',body:json({identifier:form.phone,password:form.password})});onLogin(r.token,r.user); }
    } catch(err){notify(err.message);} finally{setBusy(false);}
  };
  return <div className="auth-page"><div className="auth-left"><div className="auth-brand"><span className="brand-mark"><HeartPulse/></span>Care<span>Connect</span></div><div className="auth-copy"><div className="eyebrow light">CARE THAT CONNECTS</div><h1>Better care starts with a <em>clearer connection.</em></h1><p>Find the right specialist, book with confidence, and keep every step of your care journey in one place.</p><div className="auth-proof"><div><b>01</b><span>Discover trusted hospitals</span></div><div><b>02</b><span>Choose your doctor & time</span></div><div><b>03</b><span>Stay connected to your care</span></div></div></div><div className="auth-footer">A more thoughtful way to manage healthcare.</div></div>
    <div className="auth-right"><div className="auth-form-wrap"><div className="eyebrow">WELCOME TO CARECONNECT</div><h2>{mode==='register'?(pending?'Verify your phone':'Create your account'):'Welcome back'}</h2><p className="muted">{mode==='register'?(pending?'Enter the verification code sent to your mobile.':'A few details to get your care journey started.'):'Sign in to continue to your personal care space.'}</p>
    <form onSubmit={submit}>
      {mode==='register'&&!pending&&<><label>Full name<input name="name" value={form.name} onChange={update} placeholder="Your name" required/></label><label>Email address<input type="email" name="email" value={form.email} onChange={update} placeholder="you@example.com" required/></label></>}
      <label>Mobile number<input name="phone" value={form.phone} onChange={update} placeholder="+91 98765 43210" required/></label>
      {mode==='register'&&pending?<label>6-digit OTP<input name="code" value={form.code} onChange={update} inputMode="numeric" maxLength="6" placeholder="Enter verification code" required/></label>:<label>Password<input type="password" name="password" value={form.password} onChange={update} minLength="8" placeholder="At least 8 characters" required/></label>}
      <button className="primary-button full" disabled={busy}>{busy?'Please wait…':mode==='register'?(pending?'Verify & create account':'Send verification code'):'Sign in'} <span>→</span></button>
    </form>
    <div className="auth-switch">{mode==='register'?'Already have an account?':'New to CareConnect?'} <button onClick={()=>{setMode(mode==='register'?'login':'register');setPending(false);setForm({name:'',email:'',phone:'',password:'',code:''});}}>{mode==='register'?'Sign in':'Create an account'}</button></div>
    <div className="secure-note"><ShieldCheck size={16}/> Your account is protected with secure authentication.</div></div></div>
    {notice&&<div className="toast">{notice}</div>}
  </div>;
}

function PageTitle({eyebrow,title,description,action}) {return <div className="page-title"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;}
function Overview({user,appointments,hospitals,doctors,go}) {
  const patient=user.role==='patient';
  return <><PageTitle eyebrow="YOUR CARE SPACE" title={`Good day, ${user.name?.split(' ')[0] || 'there'}`} description={patient?'Your healthcare journey, thoughtfully organised in one place.':user.role==='doctor'?'Your schedule and patient care at a glance.':'Manage your hospital services and care operations.'} action={patient?<button className="primary-button" onClick={()=>go('find')}>Find a hospital <span>→</span></button>:null}/>
  <div className="welcome-banner"><div><span className="banner-tag">CARE, CONNECTED</span><h2>{patient?'Take the next step in your health journey.':user.role==='doctor'?'Every appointment is a moment of care.':'A better organised hospital experience.'}</h2><p>{patient?'Find a specialist and choose an appointment that works for you.':user.role==='doctor'?'Review your upcoming consultations and keep your availability up to date.':'Keep hospital information, doctors and appointments in sync.'}</p></div><div className="banner-art"><div className="art-circle"><HeartPulse size={52}/></div><span className="art-dot dot-one"/><span className="art-dot dot-two"/></div></div>
  <div className="stat-grid"><Stat label={patient?'My appointments':'Appointments'} value={appointments.length} sub="Across your care history" icon={CalendarDays}/><Stat label="Hospitals" value={hospitals.length} sub="Available in directory" icon={Hospital}/><Stat label="Specialists" value={doctors.length} sub="Listed in CareConnect" icon={Stethoscope}/><Stat label={patient?'Confirmed':'Pending review'} value={appointments.filter(a=>patient?a.status==='CONFIRMED':a.status==='WAITLISTED').length} sub="Needs your attention" icon={Activity}/></div>
  <div className="section-heading"><div><h3>Recent appointments</h3><p>Your latest booking activity</p></div><button className="text-button" onClick={()=>go(patient?'appointments':user.role==='doctor'?'doctorAppointments':'adminBookings')}>View all →</button></div>
  <div className="panel">{appointments.slice(0,4).length?appointments.slice(0,4).map(a=><AppointmentRow key={a._id} a={a} patient={patient}/>):<Empty title="No appointments yet" text={patient?'Your booked appointments will appear here.':'New patient bookings will appear here.'}/>}</div></>;
}
function Stat({label,value,sub,icon:Icon}) {return <div className="stat-card"><div className="stat-icon"><Icon size={19}/></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-sub">{sub}</div></div>;}
function Empty({title,text}) {return <div className="empty"><div className="empty-icon"><CalendarDays/></div><b>{title}</b><p>{text}</p></div>;}
function Status({value}) {return <span className={`status status-${String(value).toLowerCase()}`}>{value}</span>;}
function AppointmentRow({a,patient}) {return <div className="appointment-row"><div className="date-tile"><b>{a.date?.slice(8,10)||'--'}</b><small>{a.date?new Date(a.date+'T12:00:00').toLocaleString('en',{month:'short'}):'Date'}</small></div><div className="appointment-info"><b>{patient?a.doctorId?.name:a.patientId?.name}</b><span>{patient?a.doctorId?.speciality:a.hospitalId?.name} · {a.period} · {a.startTime||''}</span></div><div className="appointment-meta">{a.seatNumber&&<small>Seat {a.seatNumber}</small>}<Status value={a.status}/></div></div>;}

function FindHospitals({hospitals,doctors,token,onBooked,notify}) {
  const [query,setQuery]=useState('');const [selected,setSelected]=useState(null);const [doctor,setDoctor]=useState('');const [date,setDate]=useState(today);const [period,setPeriod]=useState('Morning');const [symptoms,setSymptoms]=useState('');const [emergency,setEmergency]=useState(false);const [busy,setBusy]=useState(false);const [availability,setAvailability]=useState(null);
  const filtered=hospitals.filter(h=>`${h.name} ${h.city} ${h.address}`.toLowerCase().includes(query.toLowerCase()));
  const hospitalDoctors=doctors.filter(d=>String(d.hospitalId?._id||d.hospitalId)===String(selected?._id));
  useEffect(()=>{if(!doctor||!date||!period){setAvailability(null);return;}api(`doctors/${doctor}/availability?date=${date}&period=${period}`).then(setAvailability).catch(()=>setAvailability(null));},[doctor,date,period]);
  const book=async e=>{e.preventDefault();setBusy(true);try{const r=await api('appointments/book',{token,method:'POST',body:json({doctorId:doctor,date,period,symptoms,emergencyRequested:emergency})});notify(r.message);setSelected(null);setSymptoms('');onBooked();}catch(err){notify(err.message);}finally{setBusy(false);}};
  return <><PageTitle eyebrow="DISCOVER CARE" title="Find the right hospital" description="Explore hospitals, compare specialists and choose a session that suits you."/><div className="search-bar"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by hospital, city or location…"/><span>{filtered.length} hospitals</span></div>
  <div className="hospital-grid">{filtered.map(h=><article className="hospital-card" key={h._id}><div className="hospital-cover"><div className="hospital-symbol"><Hospital size={28}/></div><span className="rating">★ {Number(h.rating||0).toFixed(1)}</span></div><div className="hospital-body"><div className="eyebrow">{h.city}</div><h3>{h.name}</h3><p>{h.address}</p><div className="hospital-meta">{h.distance!==null&&h.distance!==undefined?<span>⌖ {h.distance.toFixed(1)} km away</span>:<span>Distance unavailable</span>}<span>{h.facilities?.slice(0,2).join(' · ')}</span></div><button className="outline-button full" onClick={()=>{setSelected(h);setDoctor('');}}>View doctors & sessions <span>→</span></button></div></article>)}</div>
  {selected&&<div className="modal-backdrop" onClick={()=>setSelected(null)}><div className="modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setSelected(null)}><X/></button><div className="eyebrow">APPOINTMENT REQUEST</div><h2>{selected.name}</h2><p className="muted">{selected.address}, {selected.city} · ★ {selected.rating}</p><form onSubmit={book} className="stack-form"><label>Choose a doctor<select value={doctor} onChange={e=>setDoctor(e.target.value)} required><option value="">Select specialist</option>{hospitalDoctors.map(d=><option value={d._id} key={d._id}>{d.name} — {d.speciality}</option>)}</select></label>
  {doctor&&<div className="doctor-mini">{hospitalDoctors.find(d=>d._id===doctor)?.description||'Consultation with an experienced specialist.'}</div>}
  <div className="form-grid"><label>Appointment date<input type="date" min={today} value={date} onChange={e=>setDate(e.target.value)} required/></label><label>Session<select value={period} onChange={e=>setPeriod(e.target.value)}>{periods.map(p=><option key={p}>{p}</option>)}</select></label></div>{availability&&<div className="availability-strip"><b>{availability.remaining} seats available</b><span>{availability.startTime||'No session'} – {availability.endTime||''} · {availability.booked}/{availability.capacity} booked</span></div>}
  <label>What would you like to consult about?<textarea rows="3" value={symptoms} onChange={e=>setSymptoms(e.target.value)} placeholder="Briefly describe your concern…" required/></label>
  <label className="check-line"><input type="checkbox" checked={emergency} onChange={e=>setEmergency(e.target.checked)}/> I need urgent attention (hospital verification required)</label>
  <p className="form-hint">Available sessions and seats are validated by the server at booking time. Urgent requests are reviewed by hospital staff; this is not an emergency service.</p><button className="primary-button full" disabled={busy||!doctor||availability?.available===false}>{busy?'Checking availability…':'Request appointment →'}</button></form></div></div>}
  {!filtered.length&&<Empty title="No hospitals found" text="Try another hospital name or city."/>}</>;
}
function PatientAppointments({appointments,token,refresh}) {
  const [selected,setSelected]=useState(null);
  return <><PageTitle eyebrow="YOUR BOOKINGS" title="My appointments" description="Keep track of your confirmed sessions and consultation records."/><div className="panel">{appointments.length?appointments.map(a=><div key={a._id}><AppointmentRow a={a} patient/><div className="row-actions"><button className="text-button" onClick={()=>setSelected(a)}>View details & prescription →</button></div></div>):<Empty title="No appointments booked" text="Your appointment details will appear here after booking."/>}</div>
  {selected&&<div className="modal-backdrop" onClick={()=>setSelected(null)}><div className="modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setSelected(null)}><X/></button><div className="eyebrow">APPOINTMENT DETAILS</div><h2>{selected.doctorId?.name}</h2><p>{selected.hospitalId?.name} · {selected.date} · {selected.period} · Seat {selected.seatNumber||'Waitlist'}</p><Status value={selected.status}/><h3>Consultation notes</h3><p>{selected.consultationNotes||'Not yet added by the doctor.'}</p><h3>Diagnosis</h3><p>{selected.diagnosis||'Pending consultation.'}</p><h3>Prescription</h3>{selected.prescription?.length?selected.prescription.map((m,i)=><div className="medicine-row" key={i}><b>{m.medicine}</b><span>{m.dosage} · {m.timing} · {m.duration}</span><small>{m.instructions}</small></div>):<p>No prescription has been issued yet.</p>}{selected.prescription?.length>0&&<button className="primary-button print-action" onClick={()=>window.print()}>Print prescription ↗</button>}</div></div>}</>;
}
function PatientProfile({user,token,notify}) {
  const [form,setForm]=useState({name:user.name||'',age:'',gender:'',address:''});
  const save=async e=>{e.preventDefault();try{await api('profile/me',{token,method:'PATCH',body:json({...form,age:Number(form.age)||undefined})});notify('Profile updated.');}catch(err){notify(err.message);}};
  return <><PageTitle eyebrow="PERSONAL INFORMATION" title="My health profile" description="Keep your basic details up to date for a smoother consultation."/><div className="panel form-panel"><form className="stack-form" onSubmit={save}><div className="form-grid"><label>Patient name<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Age<input type="number" min="0" max="120" value={form.age} onChange={e=>setForm({...form,age:e.target.value})} placeholder="Your age"/></label><label>Gender<select value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})}><option value="">Prefer not to say</option><option>Female</option><option>Male</option><option>Other</option></select></label><label>Mobile number<input value={user.phone} disabled/></label></div><label>Address<textarea rows="3" value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></label><button className="primary-button">Save profile</button></form></div></>;
}
function Notifications({items,refresh}) {return <><PageTitle eyebrow="UPDATES" title="Notifications" description="Appointment confirmations and care updates in one place." action={<button className="outline-button" onClick={refresh}>Refresh</button>}/><div className="panel">{items.length?items.map(n=><div className="notification-row" key={n.id}><div className="notification-icon"><Bell size={18}/></div><div><b>{n.title}</b><p>{n.message}</p><small>{new Date(n.createdAt).toLocaleString()}</small></div><Status value={n.status}/></div>):<Empty title="You're all caught up" text="New appointment updates will appear here."/>}</div></>;}

function AdminHospital({hospitals,token,refresh,notify}) {
 const [form,setForm]=useState({name:'',description:'',address:'',city:'',latitude:'',longitude:'',rating:'4.5',phone:'',facilities:''});
 const change=e=>setForm({...form,[e.target.name]:e.target.value});
 const submit=async e=>{e.preventDefault();try{await api('hospitals',{token,method:'POST',body:json({...form,latitude:form.latitude?Number(form.latitude):undefined,longitude:form.longitude?Number(form.longitude):undefined,rating:Number(form.rating),facilities:form.facilities.split(',').map(x=>x.trim()).filter(Boolean)})});notify('Hospital details saved.');setForm({name:'',description:'',address:'',city:'',latitude:'',longitude:'',rating:'4.5',phone:'',facilities:''});refresh();}catch(err){notify(err.message);}};
 return <><PageTitle eyebrow="HOSPITAL ADMIN" title="Hospital details" description="Publish the hospital profile patients use to discover your services."/><div className="two-column"><div className="panel form-panel"><h3>Add hospital profile</h3><form className="stack-form" onSubmit={submit}><label>Hospital name<input name="name" value={form.name} onChange={change} required/></label><label>Description<textarea name="description" value={form.description} onChange={change}/></label><label>Full address<input name="address" value={form.address} onChange={change} required/></label><div className="form-grid"><label>City<input name="city" value={form.city} onChange={change} required/></label><label>Contact number<input name="phone" value={form.phone} onChange={change}/></label><label>Latitude<input name="latitude" value={form.latitude} onChange={change} placeholder="e.g. 11.0168"/></label><label>Longitude<input name="longitude" value={form.longitude} onChange={change} placeholder="e.g. 76.9558"/></label><label>Rating (admin-entered)<input name="rating" type="number" min="0" max="5" step=".1" value={form.rating} onChange={change}/></label></div><label>Facilities (comma separated)<input name="facilities" value={form.facilities} onChange={change} placeholder="Emergency, Lab, Pharmacy"/></label><button className="primary-button">Save hospital</button></form></div><div className="panel"><h3>Published hospitals</h3>{hospitals.map(h=><div className="simple-row" key={h._id}><Hospital/><div><b>{h.name}</b><small>{h.city} · ★ {h.rating}</small></div></div>)}</div></div></>;
}
function AdminDoctors({hospitals,token,refresh,notify}) {
 const [form,setForm]=useState({name:'',email:'',phone:'',password:'',hospitalId:'',speciality:'',qualification:'',experienceYears:'',description:'',consultationFee:'',schedule:[]});
 const change=e=>setForm({...form,[e.target.name]:e.target.value});
 const toggle=(day,period)=>{const exists=form.schedule.find(s=>s.day===day&&s.period===period);setForm({...form,schedule:exists?form.schedule.filter(s=>!(s.day===day&&s.period===period)):[...form.schedule,{day,period,startTime:period==='Morning'?'09:00':period==='Afternoon'?'13:00':'17:00',endTime:period==='Morning'?'12:00':period==='Afternoon'?'16:00':'20:00',capacity:10,emergencyReserve:1}]});};
 const patch=(day,period,key,value)=>setForm({...form,schedule:form.schedule.map(s=>s.day===day&&s.period===period?{...s,[key]:key==='capacity'||key==='emergencyReserve'?Number(value):value}:s)});
 const submit=async e=>{e.preventDefault();try{await api('doctors',{token,method:'POST',body:json({...form,experienceYears:Number(form.experienceYears)||0,consultationFee:Number(form.consultationFee)||0})});notify('Doctor account and schedule created. Share the login details securely with the doctor.');setForm({...form,name:'',email:'',phone:'',password:'',speciality:'',qualification:'',description:'',schedule:[]});refresh();}catch(err){notify(err.message);}};
 return <><PageTitle eyebrow="HOSPITAL ADMIN" title="Manage doctors" description="Create doctor accounts and publish real weekly sessions and seat capacity."/><div className="panel form-panel"><form className="stack-form" onSubmit={submit}><div className="form-grid"><label>Doctor name<input name="name" value={form.name} onChange={change} required/></label><label>Email<input type="email" name="email" value={form.email} onChange={change} required/></label><label>Phone<input name="phone" value={form.phone} onChange={change} required/></label><label>Temporary password<input type="password" name="password" minLength="8" value={form.password} onChange={change} required/></label><label>Hospital<select name="hospitalId" value={form.hospitalId} onChange={change} required><option value="">Select hospital</option>{hospitals.map(h=><option key={h._id} value={h._id}>{h.name}</option>)}</select></label><label>Speciality<input name="speciality" value={form.speciality} onChange={change} placeholder="e.g. Cardiology" required/></label><label>Qualification<input name="qualification" value={form.qualification} onChange={change}/></label><label>Experience (years)<input type="number" name="experienceYears" value={form.experienceYears} onChange={change}/></label><label>Consultation fee<input type="number" name="consultationFee" value={form.consultationFee} onChange={change}/></label></div><label>Doctor description<textarea name="description" value={form.description} onChange={change}/></label><h3>Weekly availability · select sessions and set seat capacity</h3><div className="schedule-grid"><div className="schedule-head"><span>Day</span>{periods.map(p=><span key={p}>{p}</span>)}</div>{days.map(day=><div className="schedule-row" key={day}><b>{day}</b>{periods.map(period=>{const s=form.schedule.find(x=>x.day===day&&x.period===period);return <div className="schedule-cell" key={period}><label className="check-line"><input type="checkbox" checked={!!s} onChange={()=>toggle(day,period)}/>{s?'Enabled':'Off'}</label>{s&&<><input type="time" value={s.startTime} onChange={e=>patch(day,period,'startTime',e.target.value)}/><input type="time" value={s.endTime} onChange={e=>patch(day,period,'endTime',e.target.value)}/><label>Seats<input type="number" min="1" max="100" value={s.capacity} onChange={e=>patch(day,period,'capacity',e.target.value)}/></label><label>Emergency reserve<input type="number" min="0" max={s.capacity} value={s.emergencyReserve} onChange={e=>patch(day,period,'emergencyReserve',e.target.value)}/></label></>}</div>})}</div>)}</div><button className="primary-button">Create doctor & publish schedule</button></form></div></>;
}
function AdminBookings({appointments,token,refresh,notify}) {
 const review=async id=>{try{await api(`appointments/${id}/emergency-review`,{token,method:'PATCH',body:json({verified:true})});notify('Emergency request verified.');refresh();}catch(e){notify(e.message);}};
 return <><PageTitle eyebrow="HOSPITAL ADMIN" title="Booking overview" description="Review appointment requests and verify urgent-care priority claims."/><div className="panel">{appointments.length?appointments.map(a=><div className="admin-booking" key={a._id}><AppointmentRow a={a} patient={false}/><div className="booking-detail"><span>Patient: {a.patientId?.name} · {a.patientId?.phone}</span><span>Concern: {a.symptoms}</span>{a.emergencyRequested&&<button className="outline-button" onClick={()=>review(a._id)}>{a.emergencyVerified?'Emergency verified':'Verify emergency priority'}</button>}</div></div>):<Empty title="No bookings yet" text="Patient booking requests will appear here."/>}</div></>;
}
function DoctorAppointments({appointments,token,refresh,notify}) {
 const [selected,setSelected]=useState(null);const [diagnosis,setDiagnosis]=useState('');const [notes,setNotes]=useState('');const [meds,setMeds]=useState([{medicine:'',dosage:'',timing:'',duration:'',instructions:''}]);
 const save=async e=>{e.preventDefault();try{await api(`appointments/${selected._id}/consultation`,{token,method:'PATCH',body:json({diagnosis,consultationNotes:notes,prescription:meds.filter(m=>m.medicine.trim())})});notify('Consultation saved. Prescription is ready to print.');setSelected(null);refresh();}catch(err){notify(err.message);}};
 return <><PageTitle eyebrow="DOCTOR PORTAL" title="Patient appointments" description="Review patient details, complete consultations and issue prescriptions."/><div className="panel">{appointments.length?appointments.map(a=><div className="admin-booking" key={a._id}><AppointmentRow a={a} patient={false}/><div className="booking-detail"><span>Age: {a.patientId?.age||'Not added'} · Phone: {a.patientId?.phone}</span><span>Concern: {a.symptoms}</span><button className="text-button" onClick={()=>{setSelected(a);setDiagnosis(a.diagnosis||'');setNotes(a.consultationNotes||'');setMeds(a.prescription?.length?a.prescription:[{medicine:'',dosage:'',timing:'',duration:'',instructions:''}]);}}>Open consultation & prescription →</button></div></div>):<Empty title="No patient appointments" text="Patient bookings will appear here once scheduled."/>}</div>
 {selected&&<div className="modal-backdrop"><div className="modal modal-wide"><button className="modal-close" onClick={()=>setSelected(null)}><X/></button><div className="eyebrow">CLINICAL CONSULTATION</div><h2>{selected.patientId?.name}</h2><p>{selected.hospitalId?.name} · {selected.date} · {selected.period} · Seat {selected.seatNumber||'Waitlist'}</p><div className="patient-summary"><b>Patient concern</b><p>{selected.symptoms}</p></div><form className="stack-form" onSubmit={save}><label>Diagnosis<input value={diagnosis} onChange={e=>setDiagnosis(e.target.value)} required/></label><label>Consultation notes<textarea rows="3" value={notes} onChange={e=>setNotes(e.target.value)}/></label><div className="section-heading"><h3>Prescription</h3><button type="button" className="text-button" onClick={()=>setMeds([...meds,{medicine:'',dosage:'',timing:'',duration:'',instructions:''}])}>+ Add medicine</button></div>{meds.map((m,i)=><div className="medicine-form" key={i}><div className="form-grid"><label>Medicine<input value={m.medicine} onChange={e=>setMeds(meds.map((x,j)=>i===j?{...x,medicine:e.target.value}:x))}/></label><label>Dosage<input value={m.dosage} onChange={e=>setMeds(meds.map((x,j)=>i===j?{...x,dosage:e.target.value}:x))} placeholder="e.g. 1 tablet"/></label><label>Timing<input value={m.timing} onChange={e=>setMeds(meds.map((x,j)=>i===j?{...x,timing:e.target.value}:x))} placeholder="Morning / after food"/></label><label>Duration<input value={m.duration} onChange={e=>setMeds(meds.map((x,j)=>i===j?{...x,duration:e.target.value}:x))} placeholder="5 days"/></label></div><label>Instructions<input value={m.instructions} onChange={e=>setMeds(meds.map((x,j)=>i===j?{...x,instructions:e.target.value}:x))}/></label></div>)}<button className="primary-button">Save consultation & prescription</button></form><p className="form-hint">After saving, the patient can view and print the prescription from their appointment details.</p></div></div>}</>;
}
function DoctorSchedule({token,notify}) {
 const [doctor,setDoctor]=useState(null);const [schedule,setSchedule]=useState([]);
 useEffect(()=>{api('doctors/me',{token}).then(d=>{setDoctor(d);setSchedule(d.schedule||[])}).catch(e=>notify(e.message));},[]);
 const save=async()=>{try{await api('doctors/me/schedule',{token,method:'PATCH',body:json({schedule})});notify('Weekly schedule updated.');}catch(e){notify(e.message);}};
 return <><PageTitle eyebrow="DOCTOR PORTAL" title="Availability schedule" description="Review your published weekly consultation sessions." action={<button className="primary-button" onClick={save}>Save changes</button>}/><div className="panel"><h3>{doctor?.name||'Doctor'} · {doctor?.speciality||''}</h3><div className="schedule-grid"><div className="schedule-head"><span>Day</span>{periods.map(p=><span key={p}>{p}</span>)}</div>{days.map(day=><div className="schedule-row" key={day}><b>{day}</b>{periods.map(period=>{const s=schedule.find(x=>x.day===day&&x.period===period);return <div className="schedule-cell" key={period}>{s?<><b>{s.startTime} – {s.endTime}</b><span>{s.capacity} seats · {s.emergencyReserve} reserved</span></>:<span className="muted">Not available</span>}</div>})}</div>)}</div></div></>;
}
export default App;
