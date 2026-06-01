// app/(dashboard)/jobs/[id]/edit/page.tsx
import JobFormPage from '../../new/page';
export default function EditJobPage() {
  return <JobFormPage isEdit={true} />;
}
