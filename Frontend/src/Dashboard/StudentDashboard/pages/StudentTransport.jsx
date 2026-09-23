import { Bus, Clock3, MapPin, UserRound } from "lucide-react";
import StudentCard from "../components/StudentCard.jsx";
import StudentPageHeader from "../components/StudentPageHeader.jsx";
import StudentStatusBadge from "../components/StudentStatusBadge.jsx";
import { transport } from "../data/studentMockData.js";
export default function StudentTransport() { return <div className="sp-page"><StudentPageHeader title="Transport" subtitle="Your current college transport allocation."/><StudentCard title="Transport Allocation" action={<StudentStatusBadge value={transport.status}/>}><div className="sp-service-hero"><span><Bus size={30}/></span><div><h2>{transport.route}</h2><p>{transport.routeCode} · {transport.vehicle}</p></div></div><div className="sp-detail-grid">{[["Pickup Point", transport.pickupPoint, MapPin], ["Pickup Time", transport.pickupTime, Clock3], ["Drop Time", transport.dropTime, Clock3], ["Vehicle", transport.vehicle, Bus], ["Driver", transport.driver, UserRound], ["Bus Attendant", transport.attendant, UserRound]].map(([label, value, Icon]) => <div key={label}><Icon size={17}/><span>{label}</span><strong>{value}</strong></div>)}</div></StudentCard></div>; }
