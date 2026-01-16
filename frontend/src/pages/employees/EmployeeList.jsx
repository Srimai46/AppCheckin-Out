// frontend/src/pages/employees/EmployeeList.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import LeavePolicyModal from "../../components/shared/LeavePolicyModal";
import CsvForEmployee from "./csv/csvforEmployee";
import CsvForEmployeesAll from "./csv/csvforEmployeesAll";
import XlsxForEmployeesWorkbook from "./csv/xlsxForEmployeesWorkbook";

import { Plus, User, Users, UserMinus, Download } from "lucide-react";

import PaginationBar from "./employeeList/components/PaginationBar";
import ExportAllChooser from "./employeeList/components/ExportAllChooser";
import EmployeesTable from "./employeeList/components/EmployeesTable";
import CreateEmployeeModal from "./employeeList/modals/CreateEmployeeModal";

import useEmployees from "./employeeList/hooks/useEmployees";
import { buildCounts, filterEmployees, paginate } from "./employeeList/utils/employeeFilters";

export default function EmployeeList() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // filters
  const [roleFilter, setRoleFilter] = useState("all"); // all | Worker | HR
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | inactive
  const [activeTab, setActiveTab] = useState("active"); // active | inactive
  const [search, setSearch] = useState("");

  // paging
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // modals
  const [showModal, setShowModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  // create employee modal state
  const [roleOpen, setRoleOpen] = useState(false);

  // export per employee
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);

  // export all (chooser + 2 pages)
  const [exportAllChooserOpen, setExportAllChooserOpen] = useState(false);
  const [exportAllWorkbookOpen, setExportAllWorkbookOpen] = useState(false);
  const [exportAllEmployeesListOpen, setExportAllEmployeesListOpen] = useState(false);

  const {
    employees,
    loading,
    fetchEmployees,
    createEmployee,
    isCreating,
  } = useEmployees();

  const counts = useMemo(() => buildCounts(employees), [employees]);

  const filteredEmployees = useMemo(() => {
    return filterEmployees(employees, {
      activeTab,
      roleFilter,
      statusFilter,
      search,
    });
  }, [employees, activeTab, roleFilter, statusFilter, search]);

  const { totalPages, pageItems } = useMemo(() => {
    return paginate(filteredEmployees, page, PAGE_SIZE);
  }, [filteredEmployees, page]);

  // reset page when filters change (เหมือนเดิม)
  useMemo(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, roleFilter, statusFilter, search]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-center gap-4">
        <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
          <User className="text-blue-600" /> {t("employeeList.title")}
        </h1>

        <div className="flex items-center gap-2">
          {/* ✅ Export All */}
          <button
            type="button"
            onClick={() => setExportAllChooserOpen(true)}
            className="h-11 px-4 rounded-xl border border-gray-200 bg-white text-slate-800
              inline-flex items-center gap-2 font-black text-sm
              hover:bg-gray-50 active:scale-95 transition"
            title={t("employeeList.exportAll.buttonTitle")}
          >
            <Download size={18} />
            {t("employeeList.exportAll.button")}
          </button>

          <button
            onClick={() => {
              setShowModal(true);
              setRoleOpen(false);
            }}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95 font-bold text-sm"
          >
            <Plus size={20} /> {t("employeeList.addNew")}
          </button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex gap-2 bg-gray-100 p-1.5 rounded-2xl w-fit border border-gray-200">
          <button
            onClick={() => setActiveTab("active")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === "active"
                ? "bg-white text-blue-600 shadow-md"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Users size={18} /> {t("employeeList.activeTab")} ({counts.active})
          </button>

          <button
            onClick={() => setActiveTab("inactive")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === "inactive"
                ? "bg-white text-rose-600 shadow-md"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <UserMinus size={18} /> {t("employeeList.resignedTab")} ({counts.inactive})
          </button>
        </div>

        {/* Filters + Search */}
        <EmployeesTable.FiltersRow
          roleFilter={roleFilter}
          setRoleFilter={setRoleFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          search={search}
          setSearch={setSearch}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <EmployeesTable
          loading={loading}
          items={pageItems}
          onRowClick={(empId) => navigate(`/employees/${empId}`)}
          onExportOne={(emp) => {
            setSelectedEmp(emp);
            setExportOpen(true);
          }}
        />

        {totalPages > 1 && (
          <PaginationBar
            page={page}
            totalPages={totalPages}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          />
        )}
      </div>

      {/* Leave Policy Modal */}
      <LeavePolicyModal
        isOpen={showPolicyModal}
        onClose={() => setShowPolicyModal(false)}
      />

      {/* per-employee export */}
      <CsvForEmployee
        open={exportOpen}
        employee={selectedEmp}
        onClose={() => {
          setExportOpen(false);
          setSelectedEmp(null);
        }}
      />

      {/* ✅ Export All chooser */}
      <ExportAllChooser
        open={exportAllChooserOpen}
        onClose={() => setExportAllChooserOpen(false)}
        onPick={(mode) => {
          setExportAllChooserOpen(false);
          if (mode === "workbook") setExportAllWorkbookOpen(true);
          if (mode === "employeesList") setExportAllEmployeesListOpen(true);
        }}
      />

      {/* ✅ (1) Workbook export: per employee sheets */}
      <XlsxForEmployeesWorkbook
        open={exportAllWorkbookOpen}
        onClose={() => setExportAllWorkbookOpen(false)}
        employees={filteredEmployees}
      />

      {/* ✅ (2) Export employee list */}
      <CsvForEmployeesAll
        open={exportAllEmployeesListOpen}
        onClose={() => setExportAllEmployeesListOpen(false)}
        employees={filteredEmployees}
      />

      {/* Add Employee Modal */}
      <CreateEmployeeModal
        open={showModal}
        onClose={() => {
          if (isCreating) return;
          setRoleOpen(false);
          setShowModal(false);
        }}
        roleOpen={roleOpen}
        setRoleOpen={setRoleOpen}
        isLoading={isCreating}
        onCreated={async (payload) => {
          const ok = await createEmployee(payload);
          if (ok) {
            setShowModal(false);
            setRoleOpen(false);
            fetchEmployees();
          }
        }}
      />
    </div>
  );
}
