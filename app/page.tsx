export default function HomePage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>LTZ-CHURCH</h1>
      <p>Deploy OK.</p>

      <ul>
        <li>
          <a href="/health">/health</a>
        </li>
        <li>
          <a href="/login">/login</a>
        </li>
        <li>
          <a href="/meus-dados">/meus-dados</a>
        </li>
        <li>
          <a href="/congregacoes">/congregacoes</a>
        </li>
        <li>
          <a href="/departamentos">/departamentos</a>
        </li>
        <li>
          <a href="/membros/departamentos">/membros/departamentos</a>
        </li>
        <li>
          <a href="/departamentos-associar">/departamentos-associar (técnico)</a>
        </li>
      </ul>
    </main>
  );
}
