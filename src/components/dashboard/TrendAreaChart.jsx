import PropTypes from 'prop-types'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

const TrendAreaChart = ({ labels, seriesLabel, data }) => {
  const chartData = {
    labels,
    datasets: [
      {
        label: seriesLabel,
        data,
        fill: true,
        tension: 0.4,
        borderColor: '#f97316',
        backgroundColor: 'rgba(249, 115, 22, 0.15)',
        pointBackgroundColor: '#f97316',
        pointBorderWidth: 2,
        pointRadius: 4
      }
    ]
  }

  const options = {
    responsive: true,
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#6b7280'
        }
      },
      y: {
        grid: {
          color: 'rgba(148, 163, 184, 0.2)'
        },
        ticks: {
          color: '#6b7280',
          callback: (value) => `${Number(value) / 1000}k`
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => `${seriesLabel}: ${context.parsed.y.toLocaleString('vi-VN')}`
        }
      }
    }
  }

  return <Line data={chartData} options={options} height={110} />
}

TrendAreaChart.propTypes = {
  labels: PropTypes.arrayOf(PropTypes.string).isRequired,
  seriesLabel: PropTypes.string.isRequired,
  data: PropTypes.arrayOf(PropTypes.number).isRequired
}

export default TrendAreaChart
