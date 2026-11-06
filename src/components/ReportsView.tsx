import React, { useState, useMemo } from 'react';
import { Appointment, Practice, Staff } from '../types';
import { getGaboroneDateString } from '../utils/dateUtils';
import { RemiMascot } from './RemiMascot';
import { 
  BarChart3, 
  Calendar, 
  Building2, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  Ban, 
  AlertCircle,
  FileText
} from 'lucide-react';

interface ReportsViewProps {
  appointments: Appointment[];
  practices: Practice[];
}

type DateRangeOption = '7days' | '30days' | 'this_month' | 'custom';

export const ReportsView: React.FC<ReportsViewProps> = ({
  appointments,
  practices,
}) => {
  const todayStr = getGaboroneDateString();

  const [dateRange, setDateRange] = useState<DateRangeOption>('30days');
  const [selectedPracticeFilter, setSelectedPracticeFilter] = useState<string>('all');
  const [customStart, setCustomStart] = useState<string>(todayStr);
  const [customEnd, setCustomEnd] = useState<string>(todayStr);

  // Compute start and end date based on dateRange
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    let end = todayStr;
    let start = todayStr;

    if (dateRange === '7days') {
      const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      start = d.toISOString().split('T')[0];
    } else if (dateRange === '30days') {
      const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      start = d.toISOString().split('T')[0];
    } else if (dateRange === 'this_month') {
      const y = now.getUTCFullYear();
      const m = String(now.getUTCMonth() + 1).padStart(2, '0');
      start = `${y}-${m}-01`;
    } else if (dateRange === 'custom') {
      start = customStart;
      end = customEnd;
    }

    return { startDate: start, endDate: end };
  }, [dateRange, customStart, customEnd, todayStr]);

  // Filter appointments by date range (startAt or date) and practice
  const filteredAppointments = useMemo(() => {
    return appointments.filter(app => {
      const d = app.date || (app.startAt ? app.startAt.split('T')[0] : '');
      if (!d) return false;
      if (d < startDate || d > endDate) return false;

      if (selectedPracticeFilter !== 'all') {
        if (app.practiceId && app.practiceId !== selectedPracticeFilter) return false;
      }
      return true;
    });
  }, [appointments, startDate, endDate, selectedPracticeFilter]);

  // Overall statistics summary
  const summary = useMemo(() => {
    let total = 0;
    let attended = 0;
    let noShow = 0;
    let cancelled = 0;

    for (const app of filteredAppointments) {
      const st = (app.status || '').trim().toLowerCase();
      if (st === 'cancelled') {
        cancelled++;
        continue;
      }
      total++;
      if (st === 'attended') attended++;
      if (st === 'noshow' || st === 'no_show') noShow++;
    }

    const denom = attended + noShow;
    const noShowRate = denom > 0 ? `${Math.round((noShow / denom) * 100)}%` : 'n/a';

    return { total, attended, noShow, cancelled, noShowRate, hasCompleted: denom > 0 };
  }, [filteredAppointments]);

  // Per practice breakdown table data
  const practiceRows = useMemo(() => {
    const map: { [pId: string]: { name: string; total: number; attended: number; noShow: number; cancelled: number } } = {};

    // Initialize all active practices
    practices.forEach(p => {
      map[p.id] = { name: p.name, total: 0, attended: 0, noShow: 0, cancelled: 0 };
    });
    map['general'] = { name: 'General / Unassigned', total: 0, attended: 0, noShow: 0, cancelled: 0 };

    for (const app of filteredAppointments) {
      const pId = app.practiceId || 'general';
      if (!map[pId]) {
        const prac = practices.find(p => p.id === pId);
        map[pId] = { name: prac?.name || 'Other Practice', total: 0, attended: 0, noShow: 0, cancelled: 0 };
      }

      const st = (app.status || '').trim().toLowerCase();
      if (st === 'cancelled') {
        map[pId].cancelled++;
        continue;
      }
      map[pId].total++;
      if (st === 'attended') map[pId].attended++;
      if (st === 'noshow' || st === 'no_show') map[pId].noShow++;
    }

    return Object.entries(map).map(([pId, data]) => {
      const denom = data.attended + data.noShow;
      const rate = denom > 0 ? `${Math.round((data.noShow / denom) * 100)}%` : 'n/a';
      return { pId, ...data, rate };
    }).filter(row => row.total > 0 || row.cancelled > 0 || selectedPracticeFilter === 'all');
  }, [filteredAppointments, practices, selectedPracticeFilter]);

  // Weekly bar chart data (aggregated by week or last 4-6 weeks in range)
  const weeklyChartData = useMemo(() => {
    // Group filtered appointments by week starting Sunday/Monday
    const weeksMap: { [weekLabel: string]: { attended: number; noShow: number } } = {};
    
    for (const app of filteredAppointments) {
      const dStr = app.date || (app.startAt ? app.startAt.split('T')[0] : '');
      if (!dStr) continue;
      
      const [y, m, d] = dStr.split('-').map(Number);
      const dateObj = new Date(Date.UTC(y, m - 1, d));
      // Get week start
      const day = dateObj.getUTCDay();
      const diff = dateObj.getUTCDate() - day + (day === 0 ? -6 : 1); // Monday start
      const weekStart = new Date(dateObj.setUTCDate(diff));
      const weekLabel = `${weekStart.getUTCMonth() + 1}/${weekStart.getUTCDate()}`;

      if (!weeksMap[weekLabel]) {
        weeksMap[weekLabel] = { attended: 0, noShow: 0 };
      }

      const st = (app.status || '').trim().toLowerCase();
      if (st === 'attended') weeksMap[weekLabel].attended++;
      if (st === 'noshow' || st === 'no_show') weeksMap[weekLabel].noShow++;
    }

    return Object.entries(weeksMap).map(([week, counts]) => ({ week, ...counts }));
  }, [filteredAppointments]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F4F8F7] overflow-y-auto">
      
      {/* Top Header & Filters */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#0F766E]" />
              <h2 className="text-xl font-extrabold text-[#0B2B2A]">
                Facility Reports & Analytics
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Attendance performance, no-show rates, and cancellation audits.
            </p>
          </div>

          {/* Date Range Selector & Practice Filter */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-[#F4F8F7] px-3 py-1.5 rounded-xl border border-slate-200">
              <Calendar className="w-3.5 h-3.5 text-[#0F766E]" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRangeOption)}
                className="bg-transparent text-xs font-bold text-[#0B2B2A] focus:outline-none cursor-pointer"
              >
                <option value="7days">Last 7 days</option>
                <option value="30days">Last 30 days</option>
                <option value="this_month">This month</option>
                <option value="custom">Custom range</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-[#F4F8F7] px-3 py-1.5 rounded-xl border border-slate-200">
              <Building2 className="w-3.5 h-3.5 text-[#0F766E]" />
              <select
                value={selectedPracticeFilter}
                onChange={(e) => setSelectedPracticeFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#0B2B2A] focus:outline-none cursor-pointer"
              >
                <option value="all">All practices ({practices.length})</option>
                {practices.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Custom date range inputs if selected */}
        {dateRange === 'custom' && (
          <div className="flex items-center gap-3 bg-teal-50/60 p-3 rounded-2xl border border-teal-200 text-xs">
            <span className="font-bold text-teal-900">Custom Range:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-white border border-teal-300 px-3 py-1 rounded-xl font-semibold"
            />
            <span>to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-white border border-teal-300 px-3 py-1 rounded-xl font-semibold"
            />
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 space-y-6">
        
        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Appointments</div>
            <div className="text-2xl font-extrabold text-[#0B2B2A] mt-2">{summary.total}</div>
            <div className="text-[11px] text-slate-500 mt-1">In selected range</div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Attended</div>
            <div className="text-2xl font-extrabold text-blue-700 mt-2">{summary.attended}</div>
            <div className="text-[11px] text-slate-500 mt-1">Completed visits</div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">No-Shows</div>
            <div className="text-2xl font-extrabold text-slate-700 mt-2">{summary.noShow}</div>
            <div className="text-[11px] text-slate-500 mt-1">Missed without notice</div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cancellations</div>
            <div className="text-2xl font-extrabold text-rose-600 mt-2">{summary.cancelled}</div>
            <div className="text-[11px] text-slate-500 mt-1">Cancelled bookings</div>
          </div>

          <div className="bg-[#0F766E] text-white p-5 rounded-3xl shadow-sm flex flex-col justify-between col-span-1 sm:col-span-2 lg:col-span-1">
            <div className="text-xs font-bold text-teal-200 uppercase tracking-wider">No-Show Rate</div>
            <div className="text-3xl font-extrabold text-white mt-2">{summary.noShowRate}</div>
            <div className="text-[11px] text-teal-100/80 mt-1">No-Show / (Attended + No-Show)</div>
          </div>
        </div>

        {/* Empty State Notice for completed appointments */}
        {!summary.hasCompleted && (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-6">
            <RemiMascot size="lg" />
            <div className="space-y-1.5 text-center sm:text-left">
              <h3 className="text-base font-extrabold text-[#0B2B2A]">No completed appointments in this period yet.</h3>
              <p className="text-xs text-slate-500 max-w-lg">
                Mark appointments as attended or no-show on the Today page to see results here.
              </p>
            </div>
          </div>
        )}

        {/* Per Practice Breakdown Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-[#F4F8F7] flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#0B2B2A]">Practice Performance Breakdown</h3>
            <span className="text-xs font-semibold text-slate-500">{startDate} to {endDate}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-6 py-3.5">Practice Name</th>
                  <th className="px-6 py-3.5 text-center">Total Scheduled</th>
                  <th className="px-6 py-3.5 text-center">Attended</th>
                  <th className="px-6 py-3.5 text-center">No-Shows</th>
                  <th className="px-6 py-3.5 text-center">Cancellations</th>
                  <th className="px-6 py-3.5 text-center">No-Show Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                {practiceRows.map((row) => (
                  <tr key={row.pId} className="hover:bg-teal-50/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-[#0B2B2A]">{row.name}</td>
                    <td className="px-6 py-4 text-center font-semibold">{row.total}</td>
                    <td className="px-6 py-4 text-center font-semibold text-blue-700">{row.attended}</td>
                    <td className="px-6 py-4 text-center font-semibold text-slate-700">{row.noShow}</td>
                    <td className="px-6 py-4 text-center font-semibold text-rose-600">{row.cancelled}</td>
                    <td className="px-6 py-4 text-center font-extrabold text-teal-800">{row.rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Weekly Bar Chart of Attended vs No-Show */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-[#0B2B2A]">Weekly Attended vs No-Show Trend</h3>
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-blue-700"><span className="w-3 h-3 rounded bg-blue-600" /> Attended</span>
              <span className="flex items-center gap-1.5 text-slate-600"><span className="w-3 h-3 rounded bg-slate-400" /> No-Show</span>
            </div>
          </div>

          {weeklyChartData.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No weekly activity recorded in this date range.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 pt-4">
              {weeklyChartData.map((item, idx) => {
                const maxVal = Math.max(...weeklyChartData.map(w => w.attended + w.noShow), 1);
                const attendedHeight = Math.max(8, Math.round((item.attended / maxVal) * 120));
                const noShowHeight = Math.max(8, Math.round((item.noShow / maxVal) * 120));

                return (
                  <div key={idx} className="bg-[#F4F8F7] p-3 rounded-2xl border border-slate-200/60 flex flex-col items-center justify-end h-48">
                    <div className="w-full flex items-end justify-center gap-2 h-32 pb-2">
                      {/* Attended Bar */}
                      <div className="w-5 bg-blue-600 rounded-t-lg transition-all" style={{ height: `${attendedHeight}px` }} title={`Attended: ${item.attended}`} />
                      {/* No-Show Bar */}
                      <div className="w-5 bg-slate-400 rounded-t-lg transition-all" style={{ height: `${noShowHeight}px` }} title={`No-Show: ${item.noShow}`} />
                    </div>
                    <div className="text-[11px] font-extrabold text-[#0B2B2A] mt-2 border-t border-slate-200 w-full text-center pt-1">
                      Week {item.week}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
