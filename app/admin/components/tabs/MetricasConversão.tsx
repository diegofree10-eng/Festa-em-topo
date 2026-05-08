import { FiUsers, FiTarget, FiTrendingDown, FiArrowUpRight } from "react-icons/fi";

export function TabMetricas({ lojistas }) {
  const totalLojistas = lojistas.length;
  const emTeste = lojistas.filter(l => l.isTeste).length;
  const pagantes = lojistas.filter(l => !l.isTeste).length;
  
  // Lojistas que o vencimento passou e continuam como isTeste (não pagaram)
  const hoje = new Date();
  const churnTeste = lojistas.filter(l => {
    const venc = new Date(l.dataVencimento);
    return l.isTeste && venc < hoje;
  }).length;

  const taxaConversao = totalLojistas > 0 ? ((pagantes / totalLojistas) * 100).toFixed(1) : 0;

  return (
    <div style={styles.metricContainer}>
      <div style={styles.row}>
        <MetricCard title="Taxa de Conversão" value={`${taxaConversao}%`} icon={<FiTarget />} color="#3b82f6" />
        <MetricCard title="Assinantes Ativos" value={pagantes} icon={<FiUsers />} color="#10b981" />
        <MetricCard title="Em Período de Teste" value={emTeste} icon={<FiActivity />} color="#f59e0b" />
        <MetricCard title="Perdas (Pós-Teste)" value={churnTeste} icon={<FiTrendingDown />} color="#ef4444" />
      </div>

      <div style={styles.detailsCard}>
        <h4 style={styles.h4}>Análise de Upgrades</h4>
        <p style={styles.p}>Total de registros históricos: <strong>{totalLojistas}</strong></p>
        {/* Aqui você pode listar lojistas que mudaram de Bronze para Prata futuramente */}
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, color }) {
  return (
    <div style={{...styles.miniCard, borderLeft: `4px solid ${color}`}}>
      <div style={{color: color, fontSize: '20px'}}>{icon}</div>
      <div>
        <small style={styles.miniLabel}>{title}</small>
        <h3 style={styles.miniValue}>{value}</h3>
      </div>
    </div>
  );
}