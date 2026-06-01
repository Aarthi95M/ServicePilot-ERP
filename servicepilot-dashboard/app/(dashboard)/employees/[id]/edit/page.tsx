// app/(dashboard)/employees/[id]/edit/page.tsx
import EmployeeFormPage from '../../new/page';
export default function EditEmployeePage() {
  return <EmployeeFormPage isEdit={true} />;
}
