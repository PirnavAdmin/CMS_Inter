import { GetInTouchView } from "./GetInTouchModal.jsx";

export default function PublicContactView(props) {
  return <GetInTouchView contact={props.content || props.contact} isPageView={true} />;
}
