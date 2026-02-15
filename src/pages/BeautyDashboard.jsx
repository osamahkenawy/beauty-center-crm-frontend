import { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Dropdown, Nav, Tab } from 'react-bootstrap';
import { AuthContext } from '../App';
import 'bootstrap/dist/css/bootstrap.min.css';
import './BeautyDashboard.css';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

// Import chart components
import { 
  WeeklySalesBarChart, 
  HandleOrderChart, 
  HandleMarketShare, 
  ProgressBarChart, 
  BalanceChart,
  ChartBarRunning 
} from '../components/dashboard';

// SVG Icons
const SVGICON = {
  starblue: <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><circle cx="4" cy="4" r="4" fill="var(--primary)"/></svg>,
  stargreen: <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><circle cx="4" cy="4" r="4" fill="#01BD9B"/></svg>,
  stargrey: <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><circle cx="4" cy="4" r="4" fill="#738293"/></svg>,
  tablesort: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h12M3 18h6"/></svg>,
  tablefilter: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"/></svg>,
  tableaction: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>,
};

// Avatar Images (using placeholder URLs)
const IMAGES = {
  avtar1: 'https://ui-avatars.com/api/?name=Sarah+J&background=E91E63&color=fff',
  avtar2: 'https://ui-avatars.com/api/?name=Emily+D&background=9C27B0&color=fff',
  avtar3: 'https://ui-avatars.com/api/?name=Jess+B&background=673AB7&color=fff',
  avtar4: 'https://ui-avatars.com/api/?name=Amanda+W&background=3F51B5&color=fff',
  avtar5: 'https://ui-avatars.com/api/?name=Rachel+G&background=2196F3&color=fff',
  avtar6: 'https://ui-avatars.com/api/?name=Lisa+M&background=00BCD4&color=fff',
  swipershirt1: '/assets/images/service-hair.jpg',
  swipershirt2: '/assets/images/service-facial.jpg',
  swipershirt3: '/assets/images/service-nails.jpg',
  swipershirt4: '/assets/images/service-massage.jpg',
};

// Contact data for People Contact section
const contactdata = [
  { image: IMAGES.avtar1, name: "Sarah Johnson", email: "sarah@mail.com" },
  { initials: "ED", name: "Emily Davis", email: "emily@mail.com", class: "bg-success-light text-success" },
  { image: IMAGES.avtar3, name: "Jessica Brown", email: "jess@mail.com", class: "bg-purple-light" },
  { image: IMAGES.avtar4, name: "Amanda White", email: "amanda@mail.com", class: "bg-cream-light" },
  { image: IMAGES.avtar5, name: "Rachel Green", email: "rachel@mail.com" },
  { image: IMAGES.avtar6, name: "Lisa Moore", email: "lisa@mail.com" },
];

// Service data
const serviceData = [
  { name: 'Hair Styling', price: 'AED 150', image: IMAGES.swipershirt1 },
  { name: 'Facial', price: 'AED 120', image: IMAGES.swipershirt2 },
  { name: 'Nails', price: 'AED 80', image: IMAGES.swipershirt3 },
  { name: 'Massage', price: 'AED 200', image: IMAGES.swipershirt4 },
];

const BeautyDashboard = () => {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState([
    { id: 'TXN001', date: '18 Feb 2025', client: 'Sarah Johnson', payment: 'AED 250', status: 'Completed' },
    { id: 'TXN002', date: '18 Feb 2025', client: 'Emily Davis', payment: 'AED 180', status: 'Pending' },
    { id: 'TXN003', date: '18 Feb 2025', client: 'Jessica Brown', payment: 'AED 320', status: 'Completed' },
    { id: 'TXN004', date: '18 Feb 2025', client: 'Amanda White', payment: 'AED 200', status: 'Pending' },
    { id: 'TXN005', date: '18 Feb 2025', client: 'Rachel Green', payment: 'AED 280', status: 'Completed' },
  ]);
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'ascending' });

  const chackboxFun = (type) => {
    setTimeout(() => {
      const motherChackBox = document.querySelector('.home-check');
      const chackbox = document.querySelectorAll('.home-check1');
      for (let i = 0; i < chackbox.length; i++) {
        const element = chackbox[i];
        if (type === 'all') {
          if (motherChackBox?.checked) {
            element.checked = true;
          } else {
            element.checked = false;
          }
        } else {
          if (!element.checked) {
            if (motherChackBox) motherChackBox.checked = false;
            break;
          } else {
            if (motherChackBox) motherChackBox.checked = true;
          }
        }
      }
    }, 100);
  };

  const sortData = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    const sortedData = [...data].sort((a, b) => {
      if (a[key] < b[key]) {
        return direction === 'ascending' ? -1 : 1;
      }
      if (a[key] > b[key]) {
        return direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
    setData(sortedData);
    setSortConfig({ key, direction });
  };

  return (
    <>
      <div className="page-head">
        <div className="row">
          <div className="col-sm-6 mb-sm-4 mb-3">
            <h3 className="mb-0">Good Morning, {user?.full_name || 'Demo User'}</h3>
            <p className="mb-0">Here's what's happening with your beauty center today</p>
          </div>
          <div className="col-sm-6 mb-4 text-sm-end">
            <Link to="/appointments" className="btn btn-outline-secondary">Add Appointment</Link>
            <Link to="/services" className="btn btn-primary ms-2">New Service</Link>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-xl-9">
          <div className="row">
            {/* Total Bookings Card */}
            <div className="col-xl-3 col-lg-6">
              <div className="card ic-chart-card">
                <div className="card-header d-block border-0 pb-0">
                  <div className="d-flex justify-content-between">
                    <h6 className="mb-0">Total Bookings</h6>
                    <span className="badge badge-sm badge-success light">+12%</span>
                  </div>
                  <span className="data-value">184</span>
                </div>
                <div className="card-body p-0">
                  <div id="handleWeeklySales" className="chart-offset">
                    <WeeklySalesBarChart color="var(--primary)" />
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue Card */}
            <div className="col-xl-3 col-lg-6">
              <div className="card ic-chart-card">
                <div className="card-header d-block border-0">
                  <div className="d-flex justify-content-between">
                    <h6 className="mb-0">Revenue</h6>
                    <span className="badge badge-sm badge-info light">+8.2%</span>
                  </div>
                  <span className="data-value">AED<br/>24.5k</span>
                </div>
                <div className="card-body p-0 pb-3">
                  <div id="handleOrderChart">
                    <HandleOrderChart color="var(--secondary)" />
                  </div>
                </div>
              </div>
            </div>

            {/* Total Clients Card */}
            <div className="col-xl-3 col-lg-6">
              <div className="card ic-chart-card">
                <div className="card-header d-block border-0 pb-0">
                  <div className="d-flex justify-content-between">
                    <h6 className="mb-0">Total Clients</h6>
                    <span className="badge badge-sm badge-success light">320</span>
                  </div>
                  <span className="data-value">2.5k</span>
                </div>
                <div className="card-body d-flex align-items-center justify-content-between py-2 pe-1">
                  <div className="clearfix">
                    <div className="d-flex align-items-center mb-2">
                      {SVGICON.starblue}
                      <span className="text-dark fs-13 ms-2">Regular</span>
                    </div>
                    <div className="d-flex align-items-center mb-2">
                      {SVGICON.stargreen}
                      <span className="text-dark fs-13 ms-2">VIP</span>
                    </div>
                    <div className="d-flex align-items-center mb-2">
                      {SVGICON.stargrey}
                      <span className="text-dark fs-13 ms-2">New</span>
                    </div>
                  </div>
                  <div id="handleMarketShare">
                    <HandleMarketShare data={[1800, 500, 200]} labels={["Regular", "VIP", "New"]} />
                  </div>
                </div>
              </div>
            </div>

            {/* Services Card */}
            <div className="col-xl-3 col-lg-6">
              <div className="card ic-chart-card">
                <div className="card-header d-block border-0 pb-0">
                  <div className="d-flex justify-content-between">
                    <h6 className="mb-0">Services</h6>
                    <span className="badge badge-sm badge-success light">45</span>
                  </div>
                  <span className="data-value">12</span>
                </div>
                <div className="card-footer border-0 mt-auto">
                  <h6>Top Services</h6>
                  <ul className="avtar-list service-tags">
                    <li><span>Hair Styling</span></li>
                    <li><span>Facial</span></li>
                    <li><span>Nails</span></li>
                    <li><span>Massage</span></li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Client Contact Section */}
            <div className="col-xl-5">
              <div className="card">
                <div className="card-header border-0 pb-0">
                  <h5>Client Contact</h5>
                  <form className="card-search">
                    <div className="input-group search-area style-1 wow">
                      <span className="input-group-text">
                        <Link to="#" className="m-0">
                          <i className="flaticon-search-interface-symbol">🔍</i>
                        </Link>
                      </span>
                      <input type="text" className="form-control" placeholder="Search" />
                    </div>
                    <button type="button" className="btn btn-primary btn-sm">
                      <i className="fa-solid fa-plus">+</i>
                    </button>
                  </form>
                </div>
                <div className="card-body">
                  <div className="row g-2">
                    {contactdata.map((contact, i) => (
                      <div className="col-xl-4 col-sm-4 col-6" key={i}>
                        <div className={`avatar-card text-center border-dashed rounded px-2 py-3 ${contact.class || ''}`}>
                          {contact.image ? (
                            <img className="avatar avatar-lg avatar-circle mb-2" src={contact.image} alt={contact.name} />
                          ) : (
                            <div className={`avatar avatar-label avatar-lg avatar-circle mb-2 mx-auto ${contact.class || 'bg-primary-light text-primary'}`}>
                              {contact.initials}
                            </div>
                          )}
                          <h6 className="mb-0">{contact.name}</h6>
                          <span className="fs-12">{contact.email}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Progress/Achievements Card */}
            <div className="col-xl-3 col-md-6">
              <div className="card">
                <div className="card-body mb-0">
                  <div id="redial">
                    <ProgressBarChart value={75} color="#E91E63" />
                  </div>
                  <div className="redia-date text-center">
                    <h4>My Progress</h4>
                    <p className="mb-0">Lorem ipsum dolor sit amet, consectetur</p>
                  </div>
                </div>
                <div className="card-footer text-center border-0 pt-0">
                  <Link to="#" className="btn btn-primary">More Details</Link>
                </div>
              </div>
            </div>

            {/* Balance Card */}
            <div className="col-xl-4 col-md-6">
              <div className="card blance">
                <div className="card-header align-items-baseline border-0 pb-0">
                  <div>
                    <h5 className="mb-0">Your Balance</h5>
                    <h4 className="mb-0">AED 25,217k</h4>
                  </div>
                  <p className="mb-0 fs-14 ms-auto"><span className="text-success">+2.7% </span>than last week</p>
                </div>
                <div className="card-body pt-0">
                  <div id="blanceChart">
                    <BalanceChart />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Services Sidebar */}
        <div className="col-xl-3">
          <div className="card saller">
            <div className="card-header border-0 d-block text-white pb-0">
              <h4 className="text-white mb-0">Top Sellers</h4>
              <span>Users from all channels</span>
            </div>
            <div className="card-body overflow-hidden">
              <div className="seller-slider">
                <Swiper
                  className="swiper mySwiper swiper-lr"
                  spaceBetween={15}
                  slidesPerView={1.5}
                  breakpoints={{
                    360: { slidesPerView: 1.5, spaceBetween: 20 },
                    768: { slidesPerView: 2.5, spaceBetween: 40 },
                    1200: { slidesPerView: 1.5, spaceBetween: 20 },
                  }}
                >
                  {serviceData.map((service, i) => (
                    <SwiperSlide key={i}>
                      <div className="card service-card">
                        <div className="card-body product">
                          <div className="service-placeholder">
                            <span className="service-icon">
                              {i === 0 && '💇'}
                              {i === 1 && '💆'}
                              {i === 2 && '💅'}
                              {i === 3 && '🧖'}
                            </span>
                          </div>
                          <div className="product-imfo">
                            <div className="d-flex justify-content-between">
                              <span className="text-danger">Popular</span>
                              <h6 className="font-w600">{service.price}</h6>
                            </div>
                            <div className="d-flex justify-content-between">
                              <h6 className="font-w600">{service.name}</h6>
                            </div>
                          </div>
                        </div>
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
              <div className="product-details">
                <h4>Your Finances, safe and Secure</h4>
                <p>It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout.</p>
                <div className="d-flex align-items-center">
                  <ul className="avtar-list">
                    <li><img className="avatar avatar-circle borderd" src={IMAGES.avtar1} alt="" /></li>
                    <li><img className="avatar avatar-circle borderd" src={IMAGES.avtar2} alt="" /></li>
                    <li><img className="avatar avatar-circle borderd" src={IMAGES.avtar3} alt="" /></li>
                    <li><img className="avatar avatar-circle borderd" src={IMAGES.avtar4} alt="" /></li>
                    <li><img className="avatar avatar-circle borderd" src={IMAGES.avtar5} alt="" /></li>
                    <li><img className="avatar avatar-circle borderd" src={IMAGES.avtar6} alt="" /></li>
                    <li><div className="avatar-label avatar-light avatar-circle">+4K</div></li>
                  </ul>
                  <div className="ms-3">
                    <h4 className="mb-0">15k+</h4>
                    <span>Happy Clients</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Analytics - Full Width Chart */}
        <div className="col-xl-6">
          <Tab.Container defaultActiveKey="week">
            <div className="card overflow-hidden">
              <div className="card-header border-0 pb-0 flex-wrap">
                <div className="blance-media">
                  <h5 className="mb-0">Sales Revenues</h5>
                  <h4 className="mb-0">AED 25,217k <span className="badge badge-sm badge-success light">+2.7%</span></h4>
                </div>
                <Nav className="nav nav-pills mix-chart-tab" defaultActiveKey="week">
                  <Nav.Item className="nav-item">
                    <Nav.Link className="nav-link" eventKey="week">Week</Nav.Link>
                  </Nav.Item>
                  <Nav.Item className="nav-item">
                    <Nav.Link className="nav-link" eventKey="month">Month</Nav.Link>
                  </Nav.Item>
                  <Nav.Item className="nav-item">
                    <Nav.Link className="nav-link" eventKey="year">Year</Nav.Link>
                  </Nav.Item>
                  <Nav.Item className="nav-item">
                    <Nav.Link className="nav-link" eventKey="all">All</Nav.Link>
                  </Nav.Item>
                </Nav>
              </div>
              <div className="card-body p-0">
                <Tab.Content>
                  <Tab.Pane eventKey="week">
                    <div id="chartBarRunning" className="pt-0">
                      <ChartBarRunning variant={1} />
                    </div>
                  </Tab.Pane>
                  <Tab.Pane eventKey="month">
                    <div id="chartBarRunning" className="pt-0">
                      <ChartBarRunning variant={2} />
                    </div>
                  </Tab.Pane>
                  <Tab.Pane eventKey="year">
                    <div id="chartBarRunning" className="pt-0">
                      <ChartBarRunning variant={3} />
                    </div>
                  </Tab.Pane>
                  <Tab.Pane eventKey="all">
                    <div id="chartBarRunning" className="pt-0">
                      <ChartBarRunning variant={4} />
                    </div>
                  </Tab.Pane>
                </Tab.Content>
                <div className="ttl-project">
                  <div className="pr-data">
                    <h5>12,721</h5>
                    <span>Number of Projects</span>
                  </div>
                  <div className="pr-data">
                    <h5 className="text-primary">721</h5>
                    <span>Active Projects</span>
                  </div>
                  <div className="pr-data">
                    <h5>AED 2,50,523</h5>
                    <span>Revenue</span>
                  </div>
                  <div className="pr-data">
                    <h5 className="text-success">12,275h</h5>
                    <span>Working Hours</span>
                  </div>
                </div>
              </div>
            </div>
          </Tab.Container>
        </div>

        {/* Transaction Details Table */}
        <div className="col-xl-6">
          <div className="card">
            <div className="card-header flex-wrap">
              <h5 className="mb-0">Transaction Details</h5>
              <div className="d-flex align-items-center justify-content-between transaction flex-wrap">
                <div className="input-group search-area style-1">
                  <span className="input-group-text"><Link to="#" className="m-0">🔍</Link></span>
                  <input type="text" className="form-control" placeholder="Search" />
                </div>
                <Link to="#" className="btn">{SVGICON.tablesort} Sort By</Link>
                <Link to="#" className="btn">{SVGICON.tablefilter} Filter</Link>
              </div>
            </div>
            <div className="card-body pb-2">
              <div className="table-responsive">
                <div className="dataTables_wrapper no-footer">
                  <table id="transaction-tbl" className="table transaction-tbl ItemsCheckboxSec dataTable no-footer">
                    <thead className="border-self">
                      <tr>
                        <th className="sorting c-pointer" onClick={() => sortData('id')}>
                          <div className="form-check custom-checkbox">
                            <input type="checkbox" className="form-check-input home-check" id="checkAll" onClick={() => chackboxFun('all')} />
                            <label className="form-check-label" htmlFor="checkAll"></label>
                          </div>
                          <span>ID</span>
                        </th>
                        <th className="sorting c-pointer" onClick={() => sortData('date')}>Date</th>
                        <th className="sorting c-pointer" onClick={() => sortData('client')}>Client</th>
                        <th className="sorting c-pointer" onClick={() => sortData('payment')}>Payment</th>
                        <th className="sorting c-pointer" onClick={() => sortData('status')}>Status</th>
                        <th className="sorting c-pointer" onClick={() => sortData('action')}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((item, index) => (
                        <tr key={index}>
                          <td className="sorting_1">
                            <div className="form-check custom-checkbox">
                              <input type="checkbox" className="form-check-input home-check1" required onClick={() => chackboxFun()} />
                              <label className="form-check-label" htmlFor="customCheckBox3"></label>
                            </div>
                            <span>{item.id}</span>
                          </td>
                          <td><p className="mb-0 ms-2">{item.date}</p></td>
                          <td><span>{item.client}</span></td>
                          <td><span className={item.status === 'Completed' ? 'text-success' : 'text-warning'}>{item.payment}</span></td>
                          <td className="pe-0">
                            <span className={`badge badge-sm ${item.status === 'Completed' ? 'badge-primary' : 'badge-warning'} light`}>
                              {item.status}
                            </span>
                          </td>
                          <td>
                            <Dropdown className="dropdown c-pointer ms-2" align="end">
                              <Dropdown.Toggle as="div" className="btn-link i-false custome-d">
                                {SVGICON.tableaction}
                              </Dropdown.Toggle>
                              <Dropdown.Menu className="dropdown-menu dropdown-menu-end">
                                <Dropdown.Item href="#">Delete</Dropdown.Item>
                                <Dropdown.Item href="#">Edit</Dropdown.Item>
                              </Dropdown.Menu>
                            </Dropdown>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Best Selling Services */}
        <div className="col-xl-6">
          <div className="card">
            <div className="card-header border-dashed border-top-0 border-end-0 border-start-0 flex-wrap">
              <h5 className="mb-0">Best Selling Products</h5>
              <div className="d-flex align-items-center justify-content-between transaction">
                <Link to="#" className="btn">{SVGICON.tablesort} Sort By</Link>
                <Link to="#" className="btn">{SVGICON.tablefilter} Filter</Link>
              </div>
            </div>
            <div className="card-body overflow-hidden">
              <div className="best-selling-slider">
                <Swiper
                  className="swiper mySwiper1 swiper-lr"
                  spaceBetween={15}
                  slidesPerView={3.5}
                  breakpoints={{
                    360: { slidesPerView: 1.5, spaceBetween: 20 },
                    768: { slidesPerView: 3.5, spaceBetween: 20 },
                  }}
                >
                  {[
                    { name: 'Hair Styling', price: 'AED 150', icon: '💇' },
                    { name: 'Facial', price: 'AED 120', icon: '💆' },
                    { name: 'Nails', price: 'AED 80', icon: '💅' },
                    { name: 'Massage', price: 'AED 200', icon: '🧖' },
                    { name: 'Makeup', price: 'AED 90', icon: '💄' },
                  ].map((service, i) => (
                    <SwiperSlide key={i}>
                      <div className="card service-card">
                        <div className="card-body product">
                          <div className="service-placeholder">
                            <span className="service-icon">{service.icon}</span>
                          </div>
                          <div className="product-imfo">
                            <div className="d-flex justify-content-between">
                              <span className="text-danger">up to 79% off</span>
                              <h6 className="font-w600">{service.price}</h6>
                            </div>
                            <div className="d-flex justify-content-between">
                              <h6 className="font-w600">{service.name}</h6>
                              <span><del>AED 200</del></span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            </div>
          </div>
        </div>

        {/* Active Users / Locations */}
        <div className="col-xl-6 flag">
          <div className="card overflow-hidden">
            <div className="card-header border-0">
              <h5 className="mb-0">Active users</h5>
            </div>
            <div className="card-body pe-0">
              <div className="row">
                <div className="col-xl-8 active-map-main">
                  <div id="world-map" className="active-map mb-2">
                    <svg viewBox="0 0 800 400" className="world-map-svg">
                      <ellipse cx="400" cy="200" rx="350" ry="180" fill="#f5f5f5" stroke="#ddd" strokeWidth="1"/>
                      <circle cx="250" cy="150" r="8" fill="var(--primary)" opacity="0.8"/>
                      <circle cx="350" cy="200" r="6" fill="var(--primary)" opacity="0.6"/>
                      <circle cx="450" cy="180" r="10" fill="var(--primary)" opacity="0.9"/>
                      <circle cx="550" cy="220" r="5" fill="var(--primary)" opacity="0.5"/>
                      <circle cx="300" cy="250" r="7" fill="var(--primary)" opacity="0.7"/>
                    </svg>
                  </div>
                </div>
                <div className="col-xl-4 active-country dz-scroll">
                  <div>
                    {[
                      { name: 'Dubai', width: '85%', flag: '🇦🇪' },
                      { name: 'Abu Dhabi', width: '65%', flag: '🇦🇪' },
                      { name: 'Sharjah', width: '45%', flag: '🇦🇪' },
                      { name: 'Ajman', width: '30%', flag: '🇦🇪' },
                      { name: 'Ras Al Khaimah', width: '20%', flag: '🇦🇪' },
                    ].map((location, index) => (
                      <div className="country-list mt-1" key={index}>
                        <span className="country-flag">{location.flag}</span>
                        <div className="progress-box mt-0">
                          <div className="d-flex justify-content-between">
                            <p className="mb-0 c-name">{location.name}</p>
                            <p className="mb-0">{location.width}</p>
                          </div>
                          <div className="progress">
                            <div className="progress-bar bg-primary" style={{ width: location.width, height: '5px', borderRadius: '4px' }}></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BeautyDashboard;
