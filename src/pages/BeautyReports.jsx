import { useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import './BeautyReports.css';

export default function BeautyReports() {
  const [dateRange, setDateRange] = useState('week');

  // Revenue Chart
  const revenueChartOptions = {
    chart: {
      type: 'area',
      height: 300,
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    colors: ['#E91E63', '#9C27B0'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.1,
        stops: [0, 100]
      }
    },
    xaxis: {
      categories: ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      labels: { style: { colors: '#6c757d', fontSize: '12px' } }
    },
    yaxis: {
      labels: {
        style: { colors: '#6c757d', fontSize: '12px' },
        formatter: (val) => `${val} SAR`
      }
    },
    grid: {
      borderColor: '#f0f0f0',
      strokeDashArray: 4
    },
    legend: { position: 'top', horizontalAlign: 'right' },
    tooltip: {
      y: { formatter: (val) => `${val} SAR` }
    }
  };

  const revenueSeries = [
    { name: 'Revenue', data: [1200, 1800, 1500, 2200, 1900, 2500, 2100] },
    { name: 'Expenses', data: [400, 500, 450, 600, 550, 700, 580] }
  ];

  // Services Chart
  const servicesChartOptions = {
    chart: { type: 'donut', height: 280 },
    labels: ['Hair Services', 'Facial', 'Nails', 'Massage', 'Makeup'],
    colors: ['#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3'],
    legend: { position: 'bottom' },
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              formatter: () => '324'
            }
          }
        }
      }
    },
    dataLabels: { enabled: false },
    tooltip: {
      y: { formatter: (val) => `${val} bookings` }
    }
  };

  const servicesSeries = [120, 85, 60, 35, 24];

  // Staff Performance
  const staffPerformance = [
    { name: 'Fatima Al-Hassan', role: 'Senior Stylist', appointments: 45, revenue: 8500, rating: 4.9 },
    { name: 'Layla Ahmad', role: 'Beauty Specialist', appointments: 38, revenue: 6200, rating: 4.8 },
    { name: 'Sara Mohammed', role: 'Nail Artist', appointments: 52, revenue: 4800, rating: 4.7 },
    { name: 'Noor Ali', role: 'Massage Therapist', appointments: 28, revenue: 5600, rating: 4.9 },
  ];

  return (
    <div className="beauty-reports-page">
      {/* Header */}
      <div className="reports-header">
        <div>
          <h2>Business Reports</h2>
          <p>Track your salon performance and insights</p>
        </div>
        <div className="date-filters">
          <button 
            className={`date-btn ${dateRange === 'today' ? 'active' : ''}`}
            onClick={() => setDateRange('today')}
          >
            Today
          </button>
          <button 
            className={`date-btn ${dateRange === 'week' ? 'active' : ''}`}
            onClick={() => setDateRange('week')}
          >
            This Week
          </button>
          <button 
            className={`date-btn ${dateRange === 'month' ? 'active' : ''}`}
            onClick={() => setDateRange('month')}
          >
            This Month
          </button>
          <button 
            className={`date-btn ${dateRange === 'year' ? 'active' : ''}`}
            onClick={() => setDateRange('year')}
          >
            This Year
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon blue">💰</div>
          <div className="kpi-info">
            <span className="kpi-value">12,450 SAR</span>
            <span className="kpi-label">Total Revenue</span>
            <span className="kpi-change positive">+12.5%</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon pink">📅</div>
          <div className="kpi-info">
            <span className="kpi-value">324</span>
            <span className="kpi-label">Appointments</span>
            <span className="kpi-change positive">+8.3%</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon purple">👥</div>
          <div className="kpi-info">
            <span className="kpi-value">89</span>
            <span className="kpi-label">New Clients</span>
            <span className="kpi-change positive">+15.2%</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon green">⭐</div>
          <div className="kpi-info">
            <span className="kpi-value">4.8</span>
            <span className="kpi-label">Avg Rating</span>
            <span className="kpi-change positive">+0.2</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-grid">
        <div className="chart-card large">
          <div className="chart-header">
            <h3>Revenue Overview</h3>
            <button className="btn-export-chart">📥 Export</button>
          </div>
          <ReactApexChart 
            options={revenueChartOptions}
            series={revenueSeries}
            type="area"
            height={300}
          />
        </div>
        <div className="chart-card">
          <div className="chart-header">
            <h3>Services Distribution</h3>
          </div>
          <ReactApexChart 
            options={servicesChartOptions}
            series={servicesSeries}
            type="donut"
            height={280}
          />
        </div>
      </div>

      {/* Staff Performance */}
      <div className="performance-card">
        <div className="card-header">
          <h3>Staff Performance</h3>
          <button className="btn-view-all">View All →</button>
        </div>
        <div className="table-responsive">
          <table className="performance-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Role</th>
                <th>Appointments</th>
                <th>Revenue</th>
                <th>Rating</th>
                <th>Performance</th>
              </tr>
            </thead>
            <tbody>
              {staffPerformance.map((staff, index) => (
                <tr key={index}>
                  <td>
                    <div className="staff-info">
                      <span className="staff-avatar">{staff.name.charAt(0)}</span>
                      <span>{staff.name}</span>
                    </div>
                  </td>
                  <td>{staff.role}</td>
                  <td>{staff.appointments}</td>
                  <td className="revenue">{staff.revenue} SAR</td>
                  <td>
                    <span className="rating">⭐ {staff.rating}</span>
                  </td>
                  <td>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${(staff.appointments / 55) * 100}%` }}
                      ></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
