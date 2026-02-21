import ReactApexChart from "react-apexcharts";

const DEFAULT_CATEGORIES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const WeeklySalesBarChart = ({
  color = 'var(--primary)',
  name = 'Bookings',
  data,
  categories,
}) => {
  const safeData = Array.isArray(data) && data.length ? data : [28, 40, 50, 68, 30, 68, 48];
  const safeCategories = Array.isArray(categories) && categories.length ? categories : DEFAULT_CATEGORIES;

  const series = [
    {
      name,
      data: safeData,
    },
  ];

  const options = {
    chart: {
      type: 'bar',
      stacked: false,
      height: 150,
      offsetX: -8,
      offsetY: 25,
      toolbar: {
        show: false,
      }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        borderRadius: 2,
        columnWidth: '30%',
        colors: {
          backgroundBarOpacity: 1,
        },
      },
    },
    colors: [color],
    xaxis: {
      show: false,
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      labels: {
        show: false,
      },
      crosshairs: {
        show: false,
      },
      categories: safeCategories,
    },
    yaxis: {
      labels: {
        show: false,
      },
    },
    grid: {
      show: false,
    },
    toolbar: {
      enabled: false,
    },
    dataLabels: {
      enabled: false
    },
    legend: {
      show: false
    },
    fill: {
      opacity: 1
    }
  };

  return (
    <ReactApexChart
      options={options}
      series={series}
      type="bar"
      height={150}
    />
  );
};

export default WeeklySalesBarChart;
