import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import AddButton from "../../components/AddButton";
import AddPucModal from "./components/AddPucModal";
import EditPucModal from "./components/EditPucModal";
import Pagination from "../../components/Pagination";
import SearchBar from "../../components/SearchBar";
import StatisticsCard from "../../components/StatisticsCard";
import MobileCardView from "../../components/MobileCardView";
import { getTheme, getVehicleNumberDesign } from "../../context/ThemeContext";

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

import { getStatusColor, getStatusText } from "../../utils/statusUtils";
import { getVehicleNumberParts } from "../../utils/vehicleNoCheck";

const Puc = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = getTheme();
  const vehicleDesign = getVehicleNumberDesign();
  const [pucRecords, setPucRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPuc, setSelectedPuc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'expiring_soon', 'expired', 'pending'
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    limit: 20,
  });
  const [statistics, setStatistics] = useState({
    total: 0,
    expiring: 0,
    expired: 0,
    pendingPaymentCount: 0,
    pendingPaymentAmount: 0,
  });

  useEffect(() => {
    if (!location.state?.openAddModal) return;

    setIsAddModalOpen(true);
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate]);

  // Fetch PUC statistics from API
  const fetchStatistics = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/puc/statistics`, { withCredentials: true });
      if (response.data.success) {
        setStatistics({
          total: response.data.data.total,
          expiring: response.data.data.expiringSoon,
          expired: response.data.data.expired,
          pendingPaymentCount: response.data.data.pendingPaymentCount,
          pendingPaymentAmount: response.data.data.pendingPaymentAmount,
        });
      }
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  };

  // Fetch PUC records from API
  const fetchPucRecords = async (page = pagination.currentPage) => {
    setLoading(true);
    let url = `${API_URL}/api/puc`;
    const params = {
      page,
      limit: pagination.limit,
      search: searchQuery,
    };

    if (statusFilter !== "all") {
      // Convert underscore to hyphen for API endpoints
      const filterPath = statusFilter.replace("_", "-");
      url = `${API_URL}/api/puc/${filterPath}`;
    }

    try {
      const response = await axios.get(url, { params, withCredentials: true });

      if (response.data.success) {
        // Transform the data to match the display format
        const transformedRecords = response.data.data.map((record) => ({
          id: record._id,
          _id: record._id, // Keep _id for edit/delete operations
          vehicleNumber: record.vehicleNumber,
          ownerName: record.ownerName,
          mobileNumber: record.mobileNumber,
          validFrom: record.validFrom,
          validTo: record.validTo,
          totalFee: record.totalFee || 0,
          paid: record.paid || 0,
          balance: record.balance || 0,
          status: record.status,
        }));

        setPucRecords(transformedRecords);

        // Update pagination state
        if (response.data.pagination) {
          setPagination({
            currentPage: response.data.pagination.currentPage,
            totalPages: response.data.pagination.totalPages,
            totalRecords: response.data.pagination.totalRecords,
            limit: pagination.limit,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching PUC records:", error);
      toast.error(
        "Failed to fetch PUC records. Please check if the backend server is running.",
        {
          position: "top-right",
          autoClose: 3000,
        }
      );
    } finally {
      setLoading(false);
    }
  };

  // Load PUC records and statistics on component mount and when filters change
  useEffect(() => {
    fetchPucRecords(1); // Reset to page 1 when filters change
    fetchStatistics(); // Fetch fresh statistics
  }, [searchQuery, statusFilter]);

  // Page change handler
  const handlePageChange = (newPage) => {
    fetchPucRecords(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAddPuc = async () => {
    // Modal handles API call internally, just refresh data
    await fetchPucRecords();
    await fetchStatistics();
  };

  const handleEditPuc = async (formData) => {
    setLoading(true);
    try {
      // Use _id if available, fallback to id
      const pucId = selectedPuc._id || selectedPuc.id;

      const response = await axios.put(
        `${API_URL}/api/puc/id/${pucId}`,
        {
          vehicleNumber: formData.vehicleNumber,
          ownerName: formData.ownerName,
          mobileNumber: formData.mobileNumber,
          validFrom: formData.validFrom,
          validTo: formData.validTo,
          totalFee: parseFloat(formData.totalFee),
          paid: parseFloat(formData.paid),
          balance: parseFloat(formData.balance),
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        toast.success("PUC certificate updated successfully!", {
          position: "top-right",
          autoClose: 3000,
        });

        // Refresh the list and statistics from the server
        await fetchPucRecords();
        await fetchStatistics();

        // Close modal and reset
        setIsEditModalOpen(false);
        setSelectedPuc(null);
      } else {
        toast.error(`Error: ${response.data.message}`, {
          position: "top-right",
          autoClose: 3000,
        });
      }
    } catch (error) {
      console.error("Error updating PUC record:", error);

      const errorMessage = error.response?.data?.message || "Failed to update PUC certificate.";

      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (record) => {
    setSelectedPuc(record);
    setIsEditModalOpen(true);
  };

  const handleDeletePuc = async (record) => {
    // Show confirmation dialog
    const confirmDelete = window.confirm(
      `Are you sure you want to delete this PUC certificate?\n\n` +
        `Vehicle Number: ${record.vehicleNumber}\n` +
        `Valid From: ${record.validFrom}\n` +
        `Valid To: ${record.validTo}\n\n` +
        `This action cannot be undone.`
    );

    if (!confirmDelete) {
      return;
    }

    setLoading(true);
    try {
      const response = await axios.delete(
        `${API_URL}/api/puc/id/${record.id}`,
        { withCredentials: true }
      );

      if (response.data.success) {
        toast.success("PUC certificate deleted successfully!", {
          position: "top-right",
          autoClose: 3000,
        });
        // Refresh the list and statistics
        await fetchPucRecords();
        await fetchStatistics();
      } else {
        throw new Error(
          response.data.message || "Failed to delete PUC certificate"
        );
      }
    } catch (error) {
      console.error("Error deleting PUC certificate:", error);
      toast.error(`Failed to delete PUC certificate: ${error.message}`, {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Mark PUC as paid
  const handleMarkAsPaid = async (record) => {
    // Show confirmation dialog
    const confirmPaid = window.confirm(
      `Are you sure you want to mark this payment as PAID?\n\n` +
      `Vehicle Number: ${record.vehicleNumber}\n` +
      `Total Fee: ₹${(record.totalFee || 0).toLocaleString('en-IN')}\n` +
      `Current Balance: ₹${(record.balance || 0).toLocaleString('en-IN')}\n\n` +
      `This will set Paid = ₹${(record.totalFee || 0).toLocaleString('en-IN')} and Balance = ₹0`
    );

    if (!confirmPaid) {
      return;
    }

    setLoading(true);
    try {
      // Make PATCH request to backend
      const response = await axios.patch(`${API_URL}/api/puc/id/${record.id}/mark-as-paid`, {}, { withCredentials: true });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to mark payment as paid');
      }

      // Show success message
      toast.success('Payment marked as paid successfully!', {
        position: 'top-right',
        autoClose: 3000
      });

      // Refresh the PUC records list and statistics
      await fetchPucRecords();
      await fetchStatistics();
    } catch (error) {
      console.error('Error marking payment as paid:', error);
      toast.error(`Failed to mark payment as paid: ${error.message}`, {
        position: 'top-right',
        autoClose: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to open WhatsApp with custom message (expiring only)
  const handleWhatsAppClick = (record) => {
    if (!record.mobileNumber || record.mobileNumber === 'N/A') {
      toast.error('Mobile number not available for this record', {
        position: 'top-right',
        autoClose: 3000
      });
      return;
    }

    // Format mobile number (remove spaces, dashes, etc.)
    let phoneNumber = record.mobileNumber.replace(/\D/g, '');

    // Add +91 country code if not already present
    if (!phoneNumber.startsWith('91')) {
      phoneNumber = '91' + phoneNumber;
    }

    // Create custom message for expiring PUC only
    let message = `Hello,\n\n`;

    if (record.status === 'expiring_soon' || record.status === 'expired') {
      const statusText = record.status === 'expired' ? 'has expired' : 'is going to expire';
      message += `Your PUC certificate ${statusText} on ${record.validTo}.\n`;
      message += `Vehicle Number: ${record.vehicleNumber}\n`;
      message += `Please renew your PUC at the earliest.\n\n`;
    }

    message += `Thank you for your cooperation.`;

    // Open WhatsApp directly (not web)
    const whatsappURL = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    window.location.href = whatsappURL;
  };

  // Determine if WhatsApp button should be shown (expiring only)
  const shouldShowWhatsAppButton = (record) => {
    return (record.status === 'expiring_soon' || record.status === 'expired');
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
        <div className="w-full px-3 md:px-4 lg:px-6 pt-4 lg:pt-6 pb-8">
          {/* Statistics Cards */}
          <div className="mb-2 mt-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3 mb-5">
              <StatisticsCard
                title="Total PUC"
                value={statistics.total}
                color="blue"
                isActive={statusFilter === "all"}
                onClick={() => setStatusFilter("all")}
                icon={
                  <svg
                    className="w-4 h-4 lg:w-6 lg:h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                }
              />
              <StatisticsCard
                title="Expiring Soon"
                value={statistics.expiring}
                color="yellow"
                isActive={statusFilter === "expiring_soon"}
                onClick={() =>
                  setStatusFilter(
                    statusFilter === "expiring_soon" ? "all" : "expiring_soon"
                  )
                }
                subtext="Within 30 days"
                icon={
                  <svg
                    className="w-4 h-4 lg:w-6 lg:h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                }
              />
              <StatisticsCard
                title="Expired"
                value={statistics.expired}
                color="red"
                isActive={statusFilter === "expired"}
                onClick={() =>
                  setStatusFilter(
                    statusFilter === "expired" ? "all" : "expired"
                  )
                }
                subtext="Expired PUC"
                icon={
                  <svg
                    className="w-4 h-4 lg:w-6 lg:h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                }
              />
              <StatisticsCard
                title="Pending Payment"
                value={statistics.pendingPaymentCount}
                color="amber"
                isActive={statusFilter === "pending"}
                onClick={() =>
                  setStatusFilter(
                    statusFilter === "pending" ? "all" : "pending"
                  )
                }
                extraValue={`₹${statistics.pendingPaymentAmount.toLocaleString(
                  "en-IN"
                )}`}
                icon={
                  <svg
                    className="w-4 h-4 lg:w-6 lg:h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                }
              />
            </div>
          </div>

          {/* PUC Table */}
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border-b border-gray-200">
              <div className="flex flex-col lg:flex-row gap-2 items-stretch lg:items-center">
                {/* Search Bar */}
                <SearchBar
                  value={searchQuery}
                  onChange={(value) => setSearchQuery(value)}
                  placeholder="Search by vehicle number..."
                  toUpperCase={true}
                />

                {/* Add Button */}
                <AddButton
                  onClick={() => setIsAddModalOpen(true)}
                  title="Add New PUC"
                />
              </div>

              {/* Results count */}
              <div className="mt-3 text-xs text-gray-600 font-semibold">
                Showing {pucRecords.length} of {pagination.totalRecords}{" "}
                records
              </div>
            </div>

            {/* Loading Indicator */}
            {loading && (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                <p className="mt-4 text-gray-600 font-semibold">
                  Loading PUC records...
                </p>
              </div>
            )}

            {/* Mobile Card View */}
            <MobileCardView
              records={pucRecords}
              emptyMessage={{
                title: 'No PUC records found',
                description: 'Click "Add New" to add your first record',
              }}
              loadingMessage='Loading PUC records...'
              cardConfig={{
                header: {
                  avatar: null,
                  title: (record) => record.vehicleNumber,
                  subtitle: (record) => (
                    record.mobileNumber && (
                      <a
                        href={`tel:${record.mobileNumber}`}
                        className='flex items-center mt-1 text-blue-600 font-semibold hover:text-blue-700 active:text-blue-800 transition-all cursor-pointer underline decoration-blue-400 underline-offset-2'
                      >
                        <svg className='w-3.5 h-3.5 mr-1 text-blue-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' />
                        </svg>
                        {record.mobileNumber}
                      </a>
                    )
                  ),
                  extraInfo: null,
                  showVehicleParts: true,
                },
                body: {
                  showStatus: true,
                  showPayment: true,
                  showValidity: true,
                },
              }}
              actions={[
                {
                  title: 'WhatsApp Reminder',
                  condition: shouldShowWhatsAppButton,
                  onClick: handleWhatsAppClick,
                  bgColor: 'bg-green-50',
                  textColor: 'text-green-600',
                  hoverBgColor: 'bg-green-100',
                  icon: (
                    <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 24 24'>
                      <path d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z'/>
                    </svg>
                  ),
                },
                {
                  title: 'Mark as Paid',
                  condition: (record) => (record.balance || 0) > 0,
                  onClick: handleMarkAsPaid,
                  bgColor: 'bg-green-100',
                  textColor: 'text-green-600',
                  hoverBgColor: 'bg-green-200',
                  icon: (
                    <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' />
                    </svg>
                  ),
                },
                {
                  title: 'Edit',
                  onClick: (record) => {
                    setSelectedPuc(record);
                    setIsEditModalOpen(true);
                  },
                  bgColor: 'bg-amber-100',
                  textColor: 'text-amber-600',
                  hoverBgColor: 'bg-amber-200',
                  icon: (
                    <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' />
                    </svg>
                  ),
                },
                {
                  title: 'Delete',
                  onClick: handleDeletePuc,
                  bgColor: 'bg-red-100',
                  textColor: 'text-red-600',
                  hoverBgColor: 'bg-red-200',
                  icon: (
                    <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' />
                    </svg>
                  ),
                },
              ]}
            />

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className={theme.tableHeader}>
                  <tr>
                    <th className="px-4 2xl:px-6 py-3 2xl:py-4 text-left text-[10px] 2xl:text-xs font-bold text-white uppercase tracking-wide">
                      Vehicle Number
                    </th>
                    <th className="px-4 2xl:px-6 py-3 2xl:py-4 text-left text-[10px] 2xl:text-xs font-bold text-white uppercase tracking-wide">
                      Owner Name
                    </th>
                    <th className="px-4 2xl:px-6 py-3 2xl:py-4 text-left text-[10px] 2xl:text-xs font-bold text-white uppercase tracking-wide">
                      Valid From
                    </th>
                    <th className="px-4 2xl:px-6 py-3 2xl:py-4 text-left text-[10px] 2xl:text-xs font-bold text-white uppercase tracking-wide">
                      Valid To
                    </th>
                    <th className="px-4 2xl:px-6 py-3 2xl:py-4 text-right text-[10px] 2xl:text-xs font-bold text-white uppercase tracking-wide bg-white/10 pl-12 2xl:pl-16">
                      Total Fee
                    </th>
                    <th className="px-4 2xl:px-6 py-3 2xl:py-4 text-right text-[10px] 2xl:text-xs font-bold text-white uppercase tracking-wide bg-white/10">
                      Paid
                    </th>
                    <th className="px-4 2xl:px-6 py-3 2xl:py-4 text-right text-[10px] 2xl:text-xs font-bold text-white uppercase tracking-wide bg-white/10">
                      Balance
                    </th>
                    <th className="px-4 2xl:px-6 py-3 2xl:py-4 text-left text-[10px] 2xl:text-xs font-bold text-white uppercase tracking-wide pl-20 2xl:pl-32">
                      Status
                    </th>
                    <th className="px-4 2xl:px-6 py-3 2xl:py-4 text-center text-[10px] 2xl:text-xs font-bold text-white uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pucRecords.length > 0 ? (
                    pucRecords.map((record) => (
                      <tr
                        key={record.id}
                        className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:via-indigo-50/50 hover:to-purple-50/50 transition-all duration-200 group"
                      >
                        {/* Vehicle Number */}
                        <td className="px-4 2xl:px-6 py-3 2xl:py-4">
                          <div>
                            <div className="flex items-center gap-2 2xl:gap-3">
                              {(() => {
                                const parts = getVehicleNumberParts(
                                  record.vehicleNumber
                                );
                                if (!parts) {
                                  return (
                                    <div className="text-[11px] 2xl:text-sm font-inter font-bold text-gray-900">
                                      {record.vehicleNumber}
                                    </div>
                                  );
                                }
                                return (
                                  <div className={vehicleDesign.container}>
                                    <svg
                                      className="w-3.5 h-5 2xl:w-4 2xl:h-6 mr-0.5 text-blue-800 flex-shrink-0"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                                      <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                                    </svg>

                                    <span className={vehicleDesign.stateCode}>
                                      {parts.stateCode}
                                    </span>
                                    <span className={vehicleDesign.districtCode}>
                                      {parts.districtCode}
                                    </span>
                                    <span className={vehicleDesign.series}>
                                      {parts.series}
                                    </span>
                                    <span className={vehicleDesign.last4Digits}>
                                      {parts.last4Digits}
                                    </span>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </td>

                        {/* Owner Name */}
                        <td className='px-4 2xl:px-6 py-3 2xl:py-5'>
                          <div className='flex items-center'>
                            <div className='flex-shrink-0 h-8 w-8 2xl:h-10 2xl:w-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold shadow-md text-xs 2xl:text-sm'>
                              {record.ownerName?.charAt(0) || 'O'}
                            </div>
                            <div className='ml-2 2xl:ml-4'>
                              <div className='text-[11px] 2xl:text-sm font-bold text-gray-900'>{record.ownerName || 'N/A'}</div>
                              {record.mobileNumber && (
                                <div className='text-[10px] 2xl:text-xs text-gray-500 flex items-center mt-0.5 2xl:mt-1'>
                                  <svg className='w-3 h-3 mr-1' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' />
                                  </svg>
                                  {record.mobileNumber}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Valid From */}
                        <td className="px-0.5 2xl:px-1 py-3 2xl:py-5 pl-8 2xl:pl-12">
                          <div className="flex items-center text-[11px] 2xl:text-[13.8px]">
                            <span className="inline-flex items-center px-2 py-1 2xl:px-3 2xl:py-1.5 rounded-lg bg-green-100 text-green-700 font-semibold border border-green-200">
                              <svg
                                className="w-3 h-3 2xl:w-4 2xl:h-4 mr-1 2xl:mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                              {record.validFrom}
                            </span>
                          </div>
                        </td>

                        {/* Valid To */}
                        <td className="px-0.5 2xl:px-1 py-3 2xl:py-5">
                          <div className="flex items-center text-[11px] 2xl:text-[13.8px]">
                            <span className="inline-flex items-center px-2 py-1 2xl:px-3 2xl:py-1.5 rounded-lg bg-red-100 text-red-700 font-semibold border border-red-200">
                              <svg
                                className="w-3 h-3 2xl:w-4 2xl:h-4 mr-1 2xl:mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                              {record.validTo}
                            </span>
                          </div>
                        </td>

                        {/* Total Fee */}
                        <td className="px-4 py-4 bg-gray-50/50 group-hover:bg-purple-50/30 pl-12 2xl:pl-16">
                          <div className="text-right">
                            <div className="text-[11px] 2xl:text-sm font-bold text-gray-900">₹{(record.totalFee || 0).toLocaleString("en-IN")}</div>
                            <div className="text-[10px] 2xl:text-xs text-gray-500 mt-0.5">Total Amount</div>
                          </div>
                        </td>

                        {/* Paid */}
                        <td className="px-4 py-4 bg-gray-50/50 group-hover:bg-emerald-50/30">
                          <div className="text-right">
                            <div className="text-[11px] 2xl:text-sm font-bold text-emerald-600">₹{(record.paid || 0).toLocaleString("en-IN")}</div>
                            <div className="text-[10px] 2xl:text-xs text-emerald-600 mt-0.5">Paid Amount</div>
                          </div>
                        </td>

                        {/* Balance */}
                        <td className={`px-4 py-4 bg-gray-50/50 ${(record.balance || 0) > 0 ? 'group-hover:bg-amber-50/30' : 'group-hover:bg-gray-50'}`}>
                          <div className="text-right">
                            <div className={`text-[11px] 2xl:text-sm font-bold ${(record.balance || 0) > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
                              ₹{(record.balance || 0).toLocaleString("en-IN")}
                            </div>
                            <div className={`text-[10px] 2xl:text-xs mt-0.5 ${(record.balance || 0) > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
                              {(record.balance || 0) > 0 ? 'Pending' : 'Cleared'}
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 2xl:px-6 py-3 2xl:py-4 pl-20 2xl:pl-32">
                          <span
                            className={`inline-flex items-center px-2 py-1 2xl:px-3 2xl:py-1.5 rounded-full text-[10px] 2xl:text-xs font-bold ${getStatusColor(
                              record.status
                            )}`}
                          >
                            {getStatusText(record.status)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-1 2xl:px-2 py-3 2xl:py-4">
                          <div className="flex items-center justify-end gap-0.5 2xl:gap-0.5 pr-1">
                            {/* Mark as Paid Button */}
                            {(record.balance || 0) > 0 && (
                              <button
                                onClick={() => handleMarkAsPaid(record)}
                                className="p-1.5 2xl:p-2 text-green-600 hover:bg-green-100 rounded-lg transition-all group-hover:scale-110 duration-200"
                                title="Mark as Paid"
                              >
                                <svg className="w-4 h-4 2xl:w-5 2xl:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                            )}
                            {/* Edit Button */}
                            <button
                              onClick={() => handleEditClick(record)}
                              className="p-1.5 2xl:p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all group-hover:scale-110 duration-200"
                              title="Edit Record"
                            >
                              <svg
                                className="w-4 h-4 2xl:w-5 2xl:h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeletePuc(record)}
                              className="p-1.5 2xl:p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all group-hover:scale-110 duration-200"
                              title="Delete Record"
                            >
                              <svg
                                className="w-4 h-4 2xl:w-5 2xl:h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" className="px-4 py-8 text-center">
                        <div className="text-gray-400">
                          <svg
                            className="mx-auto h-8 w-8 mb-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <p className="text-sm font-semibold text-gray-600">
                            No PUC records found
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Click &quot;Add New PUC Certificate&quot; to add
                            your first record
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && pucRecords.length > 0 && (
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
                totalRecords={pagination.totalRecords}
                itemsPerPage={pagination.limit}
              />
            )}
          </div>
        </div>
      </div>

      {/* Add PUC Modal - Lazy Loaded */}
      {isAddModalOpen && (
        <AddPucModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleAddPuc}
        />
      )}

      {/* Edit PUC Modal - Lazy Loaded */}
      {isEditModalOpen && (
        <EditPucModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={handleEditPuc}
          puc={selectedPuc}
        />
      )}

    </>
  );
};

export default Puc;
