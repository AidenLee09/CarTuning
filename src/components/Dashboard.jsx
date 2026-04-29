import { motion } from 'framer-motion';
import AnalysisInsights from './AnalysisInsights.jsx';
import MechanicsReport from './MechanicsReport.jsx';
import Roadmap from './Roadmap.jsx';
import SummaryCard from './SummaryCard.jsx';
import TelemetryChart from './TelemetryChart.jsx';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: 'easeOut' } },
};

function Dashboard({ telemetry, report, analysis }) {
  return (
    <motion.section
      variants={container}
      initial="hidden"
      animate="show"
      className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]"
    >
      <motion.div variants={item}>
        <SummaryCard summary={telemetry.summary} fileName={telemetry.fileName} />
      </motion.div>

      <motion.div variants={item}>
        <TelemetryChart rows={telemetry.rows} />
      </motion.div>

      <motion.div variants={item} className="lg:col-span-2">
        <AnalysisInsights analysis={analysis} />
      </motion.div>

      <motion.div variants={item} className="lg:col-span-1">
        <MechanicsReport report={report} />
      </motion.div>

      <motion.div variants={item} className="lg:col-span-1">
        <Roadmap
          items={analysis?.roadmap ?? telemetry.roadmap}
          missingColumns={telemetry.missingColumns}
        />
      </motion.div>
    </motion.section>
  );
}

export default Dashboard;
