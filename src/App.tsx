/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  FileUp, 
  FileDown, 
  Search, 
  RotateCcw, 
  Edit2, 
  Trash2, 
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  User,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  X
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Papa from 'papaparse';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { supabase, type AshesRecord, type AshesLocation } from './supabase';
import { cn } from './utils';

// Mock data for initial development if Supabase is not connected
const MOCK_DATA: AshesRecord[] = [
  {
    id: '1',
    storage_number: '1975-07-08',
    location: 'Section A',
    deceased_name: '李寶如',
    burial_register_number: '1975-07-08',
    renter_name: '',
    storage_start_date: '1980-03-24',
    retrieval_date: null,
    cremation_date: null,
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    storage_number: 'A1110/76',
    location: 'Section B',
    deceased_name: '韋文(男)',
    burial_register_number: '1976-05-20',
    renter_name: 'Kun',
    storage_start_date: '1980-03-24',
    retrieval_date: null,
    cremation_date: null,
    created_at: new Date().toISOString()
  },
  {
    id: '3',
    storage_number: '冇紙',
    location: 'Section C',
    deceased_name: '黃荷芳(女)',
    burial_register_number: '1976-06-19',
    renter_name: '',
    storage_start_date: '1980-03-24',
    retrieval_date: null,
    cremation_date: null,
    created_at: new Date().toISOString()
  }
];

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'records' | 'locations'>('records');
  const [loginName, setLoginName] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Records state
  const [records, setRecords] = useState<AshesRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({
    text: '',
    location: '',
    date: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: keyof AshesRecord; direction: 'asc' | 'desc' } | null>(null);
  
  // Locations state
  const [locations, setLocations] = useState<AshesLocation[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationSearchText, setLocationSearchText] = useState('');
  const [locationSortConfig, setLocationSortConfig] = useState<{ key: keyof AshesLocation; direction: 'asc' | 'desc' } | null>(null);
  
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  
  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'details'>('create');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  
  // Form state for records
  const [newRecord, setNewRecord] = useState({
    storage_number: '',
    location: '',
    deceased_name: '',
    burial_register_number: '',
    renter_name: '',
    storage_start_date: '',
    retrieval_date: '',
    cremation_date: ''
  });

  // Form state for locations
  const [newLocation, setNewLocation] = useState({
    name: '',
    description: ''
  });

  const itemsPerPage = 10;

  useEffect(() => {
    if (isAuthenticated) {
      fetchRecords();
      fetchLocations();
    }
  }, [isAuthenticated]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    
    try {
      // Simple login check against Supabase table 'app_users'
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('username', loginName)
        .eq('password', password)
        .single();

      if (error || !data) {
        // Fallback for demo if Supabase table doesn't exist yet
        if (loginName === 'admin' && password === 'admin123') {
          setIsAuthenticated(true);
        } else {
          setLoginError('Invalid login name or password');
        }
      } else {
        setIsAuthenticated(true);
      }
    } catch (err) {
      // Fallback for demo
      if (loginName === 'admin' && password === 'admin123') {
        setIsAuthenticated(true);
      } else {
        setLoginError('Login failed. Please try again.');
      }
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false);
    setLoginName('');
    setPassword('');
  };

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (modalMode === 'details') return;

    setLoading(true);
    try {
      if (activeTab === 'records') {
        if (modalMode === 'create') {
          const { data, error } = await supabase
            .from('ashes_storage')
            .insert([newRecord])
            .select();

          if (error) throw error;
          if (data) setRecords([data[0], ...records]);
        } else if (modalMode === 'edit' && selectedRecordId) {
          const { data, error } = await supabase
            .from('ashes_storage')
            .update(newRecord)
            .eq('id', selectedRecordId)
            .select();

          if (error) throw error;
          if (data) setRecords(records.map(r => r.id === selectedRecordId ? data[0] : r));
        }
      } else {
        // Locations logic
        if (modalMode === 'create') {
          const { data, error } = await supabase
            .from('ashes_locations')
            .insert([newLocation])
            .select();

          if (error) throw error;
          if (data) setLocations([data[0], ...locations]);
        } else if (modalMode === 'edit' && selectedRecordId) {
          const { data, error } = await supabase
            .from('ashes_locations')
            .update(newLocation)
            .eq('id', selectedRecordId)
            .select();

          if (error) throw error;
          if (data) setLocations(locations.map(l => l.id === selectedRecordId ? data[0] : l));
        }
      }
      
      setIsCreateModalOpen(false);
      resetForm();
    } catch (err) {
      console.error('Error saving record:', err);
      // Mock fallback
      if (activeTab === 'records') {
        if (modalMode === 'create') {
          const mockNew: AshesRecord = {
            id: Math.random().toString(36).substr(2, 9),
            ...newRecord,
            created_at: new Date().toISOString()
          };
          setRecords([mockNew, ...records]);
        } else {
          setRecords(records.map(r => r.id === selectedRecordId ? { ...r, ...newRecord } : r));
        }
      } else {
        if (modalMode === 'create') {
          const mockNew: AshesLocation = {
            id: Math.random().toString(36).substr(2, 9),
            ...newLocation,
            created_at: new Date().toISOString()
          };
          setLocations([mockNew, ...locations]);
        } else {
          setLocations(locations.map(l => l.id === selectedRecordId ? { ...l, ...newLocation } : l));
        }
      }
      setIsCreateModalOpen(false);
    } finally {
      setLoading(false);
    }
  }

  const resetForm = () => {
    if (activeTab === 'records') {
      setNewRecord({
        storage_number: '',
        location: '',
        deceased_name: '',
        burial_register_number: '',
        renter_name: '',
        storage_start_date: '',
        retrieval_date: '',
        cremation_date: ''
      });
    } else {
      setNewLocation({
        name: '',
        description: ''
      });
    }
    setSelectedRecordId(null);
    setModalMode('create');
  };

  const handleEdit = (record: AshesRecord | AshesLocation) => {
    if (activeTab === 'records') {
      const r = record as AshesRecord;
      setNewRecord({
        storage_number: r.storage_number,
        location: r.location,
        deceased_name: r.deceased_name,
        burial_register_number: r.burial_register_number,
        renter_name: r.renter_name,
        storage_start_date: r.storage_start_date || '',
        retrieval_date: r.retrieval_date || '',
        cremation_date: r.cremation_date || ''
      });
    } else {
      const l = record as AshesLocation;
      setNewLocation({
        name: l.name,
        description: l.description || ''
      });
    }
    setSelectedRecordId(record.id);
    setModalMode('edit');
    setIsCreateModalOpen(true);
  };

  const handleDetails = (record: AshesRecord | AshesLocation) => {
    if (activeTab === 'records') {
      const r = record as AshesRecord;
      setNewRecord({
        storage_number: r.storage_number,
        location: r.location,
        deceased_name: r.deceased_name,
        burial_register_number: r.burial_register_number,
        renter_name: r.renter_name,
        storage_start_date: r.storage_start_date || '',
        retrieval_date: r.retrieval_date || '',
        cremation_date: r.cremation_date || ''
      });
    } else {
      const l = record as AshesLocation;
      setNewLocation({
        name: l.name,
        description: l.description || ''
      });
    }
    setSelectedRecordId(record.id);
    setModalMode('details');
    setIsCreateModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setRecordToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;
    setLoading(true);
    try {
      const table = activeTab === 'records' ? 'ashes_storage' : 'ashes_locations';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', recordToDelete);

      if (error) throw error;
      
      if (activeTab === 'records') {
        setRecords(records.filter(r => r.id !== recordToDelete));
      } else {
        setLocations(locations.filter(l => l.id !== recordToDelete));
      }
    } catch (err) {
      console.error('Error deleting record:', err);
      // Mock fallback
      if (activeTab === 'records') {
        setRecords(records.filter(r => r.id !== recordToDelete));
      } else {
        setLocations(locations.filter(l => l.id !== recordToDelete));
      }
    } finally {
      setLoading(false);
      setIsDeleteModalOpen(false);
      setRecordToDelete(null);
    }
  };

  const handleExport = () => {
    if (activeTab !== 'records') return;

    const exportData = filteredRecords.map(r => ({
      'Storage Number': r.storage_number,
      'Location': r.location || '',
      'Deceased Name': r.deceased_name,
      'Burial Register Number': r.burial_register_number || '',
      'Renter Name': r.renter_name || '',
      'Storage Start Date': r.storage_start_date || '',
      'Retrieval Date': r.retrieval_date || '',
      'Cremation Date': r.cremation_date || ''
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ashes_records_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportSubmit = async () => {
    if (!importFile) return;

    setLoading(true);
    setImportError(null);

    Papa.parse(importFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const dataToInsert = results.data.map((row: any) => ({
            storage_number: row['Storage Number'] || '',
            location: row['Location'] || '',
            deceased_name: row['Deceased Name'] || '',
            burial_register_number: row['Burial Register Number'] || '',
            renter_name: row['Renter Name'] || '',
            storage_start_date: row['Storage Start Date'] || '',
            retrieval_date: row['Retrieval Date'] || '',
            cremation_date: row['Cremation Date'] || ''
          })).filter(row => row.storage_number && row.deceased_name);

          if (dataToInsert.length === 0) {
            throw new Error('No valid records found in CSV. Ensure "Storage Number" and "Deceased Name" are present.');
          }

          const { data, error } = await supabase
            .from('ashes_storage')
            .insert(dataToInsert)
            .select();

          if (error) throw error;

          if (data) {
            setRecords([...data, ...records]);
          }
          
          setIsImportModalOpen(false);
          setImportFile(null);
        } catch (err: any) {
          console.error('Import error:', err);
          setImportError(err.message || 'Failed to import records. Please check the CSV format.');
        } finally {
          setLoading(false);
        }
      },
      error: (err) => {
        console.error('CSV Parse error:', err);
        setImportError('Failed to parse CSV file.');
        setLoading(false);
      }
    });
  };

  const handleSort = (key: string) => {
    if (activeTab === 'records') {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
        direction = 'desc';
      }
      setSortConfig({ key: key as keyof AshesRecord, direction });
    } else {
      let direction: 'asc' | 'desc' = 'asc';
      if (locationSortConfig && locationSortConfig.key === key && locationSortConfig.direction === 'asc') {
        direction = 'desc';
      }
      setLocationSortConfig({ key: key as keyof AshesLocation, direction });
    }
  };

  async function fetchRecords() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ashes_storage')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setRecords(data);
        setIsSupabaseConnected(true);
      } else {
        setRecords(MOCK_DATA);
      }
    } catch (err) {
      console.error('Error fetching records:', err);
      setRecords(MOCK_DATA);
    } finally {
      setLoading(false);
    }
  }

  async function fetchLocations() {
    setLocationsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ashes_locations')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      if (data) setLocations(data);
    } catch (err) {
      console.error('Error fetching locations:', err);
      // Mock locations if none found
      setLocations([
        { id: '1', name: 'Section A', description: 'Main area', created_at: new Date().toISOString() },
        { id: '2', name: 'Section B', description: 'Secondary area', created_at: new Date().toISOString() },
        { id: '3', name: 'Section C', description: 'Annex', created_at: new Date().toISOString() }
      ]);
    } finally {
      setLocationsLoading(false);
    }
  }

  const filteredRecords = useMemo(() => {
    let result = records.filter(record => {
      const matchesText = !appliedFilters.text || 
        record.deceased_name.toLowerCase().includes(appliedFilters.text.toLowerCase()) ||
        record.storage_number.toLowerCase().includes(appliedFilters.text.toLowerCase()) ||
        record.renter_name.toLowerCase().includes(appliedFilters.text.toLowerCase());
      
      const matchesLocation = !appliedFilters.location || record.location === appliedFilters.location;
      
      const matchesDate = !appliedFilters.date || (record.storage_start_date && record.storage_start_date.includes(appliedFilters.date));

      return matchesText && matchesLocation && matchesDate;
    });

    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key] || '';
        const bValue = b[sortConfig.key] || '';
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [records, appliedFilters, sortConfig]);

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);

  const filteredLocations = useMemo(() => {
    let result = locations.filter(loc => 
      !locationSearchText || loc.name.toLowerCase().includes(locationSearchText.toLowerCase())
    );

    if (locationSortConfig) {
      result.sort((a, b) => {
        const aValue = a[locationSortConfig.key] || '';
        const bValue = b[locationSortConfig.key] || '';
        if (aValue < bValue) return locationSortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return locationSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [locations, locationSearchText, locationSortConfig]);

  const handleReset = () => {
    setSearchText('');
    setSearchLocation('');
    setSearchDate('');
    setAppliedFilters({
      text: '',
      location: '',
      date: ''
    });
    setCurrentPage(1);
  };

  const handleSearch = () => {
    setAppliedFilters({
      text: searchText,
      location: searchLocation,
      date: searchDate
    });
    setCurrentPage(1);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex flex-col p-8 md:p-20">
        <div className="max-w-md w-full">
          <h1 className="text-5xl font-bold text-[#1a365d] mb-8">Login</h1>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-lg text-gray-700 block">Login Name</label>
              <input
                type="text"
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-lg text-gray-700 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                required
              />
            </div>
            {loginError && (
              <p className="text-red-500 text-sm font-medium">{loginError}</p>
            )}
            <button
              type="submit"
              className="bg-[#1d70b8] hover:bg-[#003078] text-white px-8 py-3 rounded text-xl font-medium transition-colors shadow-sm"
            >
              Login
            </button>
          </form>
          <p className="mt-8 text-sm text-gray-400 italic">
            Hint: Use admin / admin123 for demo
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#333] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">Universal Funeral System</h1>
          <nav className="hidden md:flex gap-6">
            <button 
              onClick={() => setActiveTab('records')}
              className={cn(
                "text-sm font-medium pb-1 transition-all",
                activeTab === 'records' ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-800"
              )}
            >
              骨灰貯存資料
            </button>
            <button 
              onClick={() => setActiveTab('locations')}
              className={cn(
                "text-sm font-medium pb-1 transition-all",
                activeTab === 'locations' ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-800"
              )}
            >
              骨灰貯存位置
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <User size={16} />
            <span>Hello Universal Admin!</span>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-1 text-gray-500 hover:text-red-600 transition-colors"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6 space-y-6">
        {activeTab === 'records' ? (
          <>
            {/* Title and Main Actions */}
            <div className="flex flex-col gap-4">
              <h2 className="text-3xl font-bold text-gray-900">骨灰貯存資料</h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    resetForm();
                    setIsCreateModalOpen(true);
                  }}
                  className="bg-[#0056b3] hover:bg-[#004494] text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-medium transition-colors shadow-sm"
                >
                  <Plus size={16} />
                  Create New
                </button>
                <button 
                  onClick={() => setIsImportModalOpen(true)}
                  className="bg-[#0056b3] hover:bg-[#004494] text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-medium transition-colors shadow-sm"
                >
                  <FileUp size={16} />
                  Import
                </button>
                <button 
                  onClick={handleExport}
                  className="bg-[#0056b3] hover:bg-[#004494] text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-medium transition-colors shadow-sm"
                >
                  <FileDown size={16} />
                  Export
                </button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">搜索文字</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      placeholder="Search by name, number..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                    />
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">骨灰貯存位置</label>
                  <select 
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm bg-white"
                  >
                    <option value="">All Locations</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.name}>{loc.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">搜索日期</label>
                  <div className="relative">
                    <DatePicker
                      selected={searchDate ? parseISO(searchDate) : null}
                      onChange={(date) => setSearchDate(date ? format(date, 'yyyy-MM-dd') : '')}
                      dateFormat="yyyy-MM-dd"
                      placeholderText="YYYY-MM-DD"
                      className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm bg-white"
                      isClearable
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button 
                  onClick={handleSearch}
                  className="bg-[#0056b3] hover:bg-[#004494] text-white px-6 py-2 rounded text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
                >
                  <Search size={16} />
                  Search
                </button>
                <button 
                  onClick={handleReset}
                  className="bg-[#0056b3] hover:bg-[#004494] text-white px-6 py-2 rounded text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
                >
                  <RotateCcw size={16} />
                  Back to Full List
                </button>
              </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-bottom border-gray-200">
                      {[
                        { key: 'storage_number', label: '骨灰貯存編號' },
                        { key: 'location', label: '骨灰貯存位置' },
                        { key: 'deceased_name', label: '死者姓名' },
                        { key: 'burial_register_number', label: '殮葬登記冊死者編號' },
                        { key: 'renter_name', label: '租用人姓名' },
                        { key: 'storage_start_date', label: '開始存放日期' },
                        { key: 'retrieval_date', label: '由持牌處所取回日期' },
                        { key: 'cremation_date', label: '火化日期' }
                      ].map((col) => (
                        <th 
                          key={col.key}
                          onClick={() => handleSort(col.key)}
                          className="px-4 py-3 text-xs font-bold text-blue-700 uppercase tracking-wider border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-1">
                            {col.label}
                            {sortConfig?.key === col.key ? (
                              sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                            ) : (
                              <ArrowUpDown size={12} className="text-gray-400" />
                            )}
                          </div>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-xs font-bold text-blue-700 uppercase tracking-wider border-b border-gray-200 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-gray-500 italic">Loading records...</td>
                      </tr>
                    ) : paginatedRecords.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-gray-500 italic">No records found matching your search.</td>
                      </tr>
                    ) : (
                      paginatedRecords.map((record) => (
                        <tr key={record.id} className="hover:bg-blue-50/30 transition-colors group">
                          <td className="px-4 py-3 text-sm font-mono text-gray-600">{record.storage_number}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{record.location}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{record.deceased_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{record.burial_register_number}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{record.renter_name || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{record.storage_start_date || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{record.retrieval_date || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{record.cremation_date || '-'}</td>
                          <td className="px-4 py-3 text-sm text-right">
                            <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => handleEdit(record)}
                                className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                              >
                                <Edit2 size={14} /> Edit
                              </button>
                              <span className="text-gray-300">|</span>
                              <button 
                                onClick={() => handleDetails(record)}
                                className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                              >
                                <Eye size={14} /> Details
                              </button>
                              <span className="text-gray-300">|</span>
                              <button 
                                onClick={() => handleDeleteClick(record.id)}
                                className="text-red-500 hover:text-red-700 flex items-center gap-1 font-medium"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                            {/* Static links as seen in image for when hover is not active */}
                            <div className="group-hover:hidden flex justify-end gap-2 text-blue-600 text-xs font-medium">
                              <span className="cursor-pointer" onClick={() => handleEdit(record)}>Edit</span>
                              <span className="text-gray-300">|</span>
                              <span className="cursor-pointer" onClick={() => handleDetails(record)}>Details</span>
                              <span className="text-gray-300">|</span>
                              <span className="cursor-pointer" onClick={() => handleDeleteClick(record.id)}>Delete</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
                <div className="flex gap-1">
                  <button 
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    <ChevronsLeft size={16} />
                  </button>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  
                  {[...Array(Math.min(10, totalPages))].map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={cn(
                          "px-3 py-1 rounded border text-sm font-medium transition-colors",
                          currentPage === pageNum 
                            ? "bg-blue-600 text-white border-blue-600" 
                            : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button 
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    <ChevronsRight size={16} />
                  </button>
                </div>
                <div className="text-sm text-gray-600 font-medium">
                  Page {currentPage} of {totalPages || 1}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Locations Tab Content */}
            <div className="flex flex-col gap-4">
              <h2 className="text-3xl font-bold text-gray-900">骨灰貯存位置</h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    resetForm();
                    setIsCreateModalOpen(true);
                  }}
                  className="bg-[#0056b3] hover:bg-[#004494] text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-medium transition-colors shadow-sm"
                >
                  <Plus size={16} />
                  Create New
                </button>
              </div>
            </div>

            {/* Search for Locations */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="max-w-md space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">搜索位置名稱</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={locationSearchText}
                    onChange={(e) => setLocationSearchText(e.target.value)}
                    placeholder="Search by location name..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                  />
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                </div>
              </div>
            </div>

            {/* Locations Table */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-bottom border-gray-200">
                      {[
                        { key: 'name', label: '位置名稱' },
                        { key: 'description', label: '描述' },
                        { key: 'created_at', label: '建立日期' }
                      ].map((col) => (
                        <th 
                          key={col.key}
                          onClick={() => handleSort(col.key)}
                          className="px-4 py-3 text-xs font-bold text-blue-700 uppercase tracking-wider border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-1">
                            {col.label}
                            {locationSortConfig?.key === col.key ? (
                              locationSortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                            ) : (
                              <ArrowUpDown size={12} className="text-gray-400" />
                            )}
                          </div>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-xs font-bold text-blue-700 uppercase tracking-wider border-b border-gray-200 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {locationsLoading ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-gray-500 italic">Loading locations...</td>
                      </tr>
                    ) : filteredLocations.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-gray-500 italic">No locations found.</td>
                      </tr>
                    ) : (
                      filteredLocations.map((loc) => (
                        <tr key={loc.id} className="hover:bg-blue-50/30 transition-colors group">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{loc.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{loc.description || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{format(new Date(loc.created_at), 'yyyy-MM-dd HH:mm')}</td>
                          <td className="px-4 py-3 text-sm text-right">
                            <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => handleEdit(loc)}
                                className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                              >
                                <Edit2 size={14} /> Edit
                              </button>
                              <span className="text-gray-300">|</span>
                              <button 
                                onClick={() => handleDetails(loc)}
                                className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                              >
                                <Eye size={14} /> Details
                              </button>
                              <span className="text-gray-300">|</span>
                              <button 
                                onClick={() => handleDeleteClick(loc.id)}
                                className="text-red-500 hover:text-red-700 flex items-center gap-1 font-medium"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                            <div className="group-hover:hidden flex justify-end gap-2 text-blue-600 text-xs font-medium">
                              <span className="cursor-pointer" onClick={() => handleEdit(loc)}>Edit</span>
                              <span className="text-gray-300">|</span>
                              <span className="cursor-pointer" onClick={() => handleDetails(loc)}>Details</span>
                              <span className="text-gray-300">|</span>
                              <span className="cursor-pointer" onClick={() => handleDeleteClick(loc.id)}>Delete</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {!isSupabaseConnected && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3">
            <div className="bg-amber-100 p-2 rounded-full text-amber-600">
              <Eye size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-800">Demo Mode Active</h4>
              <p className="text-xs text-amber-700 mt-1">
                Supabase is not connected. Showing mock data. To use your real database, update the environment variables in <code className="bg-amber-100 px-1 rounded">.env</code>.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 py-8 border-t border-gray-200 text-center text-gray-400 text-xs">
        <p>&copy; {new Date().getFullYear()} Universal Funeral System. All rights reserved.</p>
      </footer>

      {/* Create / Edit / Details Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-[#0056b3] px-6 py-4 flex justify-between items-center">
              <h3 className="text-white font-bold text-lg">
                {modalMode === 'create' ? '新增骨灰貯存資料' : modalMode === 'edit' ? '編輯骨灰貯存資料' : '骨灰貯存資料詳情'}
              </h3>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {activeTab === 'records' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">骨灰貯存編號</label>
                    <input 
                      type="text" 
                      required
                      readOnly={modalMode === 'details'}
                      value={newRecord.storage_number}
                      onChange={(e) => setNewRecord({...newRecord, storage_number: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm disabled:bg-gray-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">骨灰貯存位置</label>
                    <select 
                      disabled={modalMode === 'details'}
                      value={newRecord.location}
                      onChange={(e) => setNewRecord({...newRecord, location: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm disabled:bg-gray-50 bg-white"
                    >
                      <option value="">Select Location</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.name}>{loc.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">死者姓名</label>
                    <input 
                      type="text" 
                      required
                      readOnly={modalMode === 'details'}
                      value={newRecord.deceased_name}
                      onChange={(e) => setNewRecord({...newRecord, deceased_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm disabled:bg-gray-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">殮葬登記冊死者編號</label>
                    <input 
                      type="text" 
                      readOnly={modalMode === 'details'}
                      value={newRecord.burial_register_number}
                      onChange={(e) => setNewRecord({...newRecord, burial_register_number: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm disabled:bg-gray-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">租用人姓名</label>
                    <input 
                      type="text" 
                      readOnly={modalMode === 'details'}
                      value={newRecord.renter_name}
                      onChange={(e) => setNewRecord({...newRecord, renter_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm disabled:bg-gray-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">開始存放日期</label>
                    <DatePicker
                      selected={newRecord.storage_start_date ? parseISO(newRecord.storage_start_date) : null}
                      onChange={(date) => setNewRecord({...newRecord, storage_start_date: date ? format(date, 'yyyy-MM-dd') : ''})}
                      dateFormat="yyyy-MM-dd"
                      placeholderText="YYYY-MM-DD"
                      readOnly={modalMode === 'details'}
                      disabled={modalMode === 'details'}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm disabled:bg-gray-50 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">由持牌處所取回日期</label>
                    <DatePicker
                      selected={newRecord.retrieval_date ? parseISO(newRecord.retrieval_date) : null}
                      onChange={(date) => setNewRecord({...newRecord, retrieval_date: date ? format(date, 'yyyy-MM-dd') : ''})}
                      dateFormat="yyyy-MM-dd"
                      placeholderText="YYYY-MM-DD"
                      readOnly={modalMode === 'details'}
                      disabled={modalMode === 'details'}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm disabled:bg-gray-50 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">火化日期</label>
                    <DatePicker
                      selected={newRecord.cremation_date ? parseISO(newRecord.cremation_date) : null}
                      onChange={(date) => setNewRecord({...newRecord, cremation_date: date ? format(date, 'yyyy-MM-dd') : ''})}
                      dateFormat="yyyy-MM-dd"
                      placeholderText="YYYY-MM-DD"
                      readOnly={modalMode === 'details'}
                      disabled={modalMode === 'details'}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm disabled:bg-gray-50 bg-white"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">位置名稱</label>
                    <input 
                      type="text" 
                      required
                      readOnly={modalMode === 'details'}
                      value={newLocation.name}
                      onChange={(e) => setNewLocation({...newLocation, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm disabled:bg-gray-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">描述</label>
                    <textarea 
                      readOnly={modalMode === 'details'}
                      value={newLocation.description}
                      onChange={(e) => setNewLocation({...newLocation, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm disabled:bg-gray-50 min-h-[100px]"
                    />
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-6 py-2 border border-gray-300 rounded text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {modalMode === 'details' ? 'Close' : 'Cancel'}
                </button>
                {modalMode !== 'details' && (
                  <button 
                    type="submit"
                    className="px-6 py-2 bg-[#0056b3] hover:bg-[#004494] text-white rounded text-sm font-medium transition-colors shadow-sm"
                  >
                    {modalMode === 'create' ? 'Create Record' : 'Save Changes'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-red-600">
                <AlertTriangle size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-900">Confirm Delete</h3>
                <p className="text-gray-500">Are you sure you want to delete this record? This action cannot be undone.</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors shadow-sm"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-[#0056b3] px-6 py-4 flex justify-between items-center">
              <h3 className="text-white font-bold text-lg">Import Records from CSV</h3>
              <button 
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportFile(null);
                  setImportError(null);
                }}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div 
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('border-blue-500', 'bg-blue-50');
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
                  const file = e.dataTransfer.files[0];
                  if (file && file.type === 'text/csv') {
                    setImportFile(file);
                  } else {
                    setImportError('Please upload a valid CSV file.');
                  }
                }}
                className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center space-y-4 transition-all hover:border-blue-400 hover:bg-gray-50 cursor-pointer group"
                onClick={() => document.getElementById('csv-upload')?.click()}
              >
                <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-blue-600 group-hover:scale-110 transition-transform">
                  <FileUp size={32} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-gray-700">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-400">CSV files only</p>
                </div>
                <input 
                  id="csv-upload"
                  type="file" 
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setImportFile(file);
                  }}
                />
              </div>

              {importFile && (
                <div className="bg-blue-50 p-3 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded text-blue-600">
                      <FileUp size={16} />
                    </div>
                    <span className="text-sm font-medium text-blue-800 truncate max-w-[200px]">{importFile.name}</span>
                  </div>
                  <button 
                    onClick={() => setImportFile(null)}
                    className="text-blue-400 hover:text-blue-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {importError && (
                <div className="bg-red-50 border border-red-100 p-3 rounded-lg flex items-start gap-3 text-red-600">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <p className="text-xs font-medium">{importError}</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button 
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportFile(null);
                    setImportError(null);
                  }}
                  className="px-6 py-2 border border-gray-300 rounded text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleImportSubmit}
                  disabled={!importFile || loading}
                  className="px-6 py-2 bg-[#0056b3] hover:bg-[#004494] text-white rounded text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? 'Importing...' : 'Start Import'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
