import { useMemo, useState } from 'react'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import { Copy, Crown, Gamepad2, Plus, Users, Wifi, WifiOff } from 'lucide-react'

const sampleTiles = [[6,6],[6,4],[4,2],[2,0],[0,5],[5,3],[3,1]]
const tile = (a,b, extra='') => <div className={`tile ${extra}`} key={`${a}-${b}-${extra}`}><span>{a}</span><i /><span>{b}</span></div>

export default function App() {
  const [playerName, setPlayerName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [notice, setNotice] = useState('Crie uma sala ou entre com um código para chamar seus amigos.')
  const [busy, setBusy] = useState(false)

  const createRoom = async () => {
    if (!playerName.trim()) return setNotice('Digite seu nome antes de criar uma sala.')
    if (!isSupabaseConfigured) return setNotice('O visual está pronto. Para ativar as salas online, precisamos configurar as credenciais do Supabase.')
    setBusy(true)
    try {
      // A criação de salas será conectada à função segura do banco na próxima etapa.
      setNotice('Supabase conectado. Próxima etapa: instalar o esquema multiplayer no banco.')
    } catch {
      setNotice('Não foi possível criar a sala. Confira a conexão com o Supabase.')
    } finally { setBusy(false) }
  }

  const joinRoom = async () => {
    if (!playerName.trim() || !roomCode.trim()) return setNotice('Informe seu nome e o código da sala.')
    if (!isSupabaseConfigured) return setNotice('Configure o Supabase para entrar em partidas online.')
    setNotice('Conexão pronta. A entrada em salas será habilitada após configurar o banco.')
  }

  return <main className="app-shell">
    <header className="topbar">
      <a className="brand" href="#"><span className="brand-mark"><Gamepad2 size={21}/></span><span>DOMINÓ<span className="brand-light">SUPORTE</span></span></a>
      <div className="online-status"><span className={isSupabaseConfigured ? 'status-dot on' : 'status-dot'} />{isSupabaseConfigured ? 'Conexão configurada' : 'Aguardando configuração'}</div>
    </header>

    <section className="hero">
      <div className="hero-copy">
        <div className="eyebrow"><span/> MESA DE AMIGOS · 4 JOGADORES</div>
        <h1>Uma boa partida<br/>começa <em>com você.</em></h1>
        <p>Reúna a dupla, distribua as pedras e veja quem domina a mesa. O clássico dominó em uma experiência online.</p>
        <div className="feature-row"><span><Users size={16}/> 4 jogadores</span><span><Crown size={16}/> Duplas</span><span><Wifi size={16}/> Online</span></div>
      </div>
      <div className="table-scene" aria-label="Prévia de uma mesa de dominó">
        <div className="table-glow"/>
        <div className="table-board">
          <div className="board-label">MESA DE JOGO <span>•</span> CLÁSSICO</div>
          <div className="opponent opponent-top"><div className="avatar">M</div><div><b>Marina</b><small>Parceira</small></div><div className="back-tiles"><i/><i/><i/></div></div>
          <div className="opponent opponent-left"><div className="avatar">R</div><div><b>Rafael</b><small>Adversário</small></div></div>
          <div className="opponent opponent-right"><div className="avatar">L</div><div><b>Lucas</b><small>Adversário</small></div></div>
          <div className="chain">{[[6,6],[6,4],[4,2],[2,0],[0,5]].map(([a,b],i)=>tile(a,b,i===0?'double':''))}</div>
          <div className="center-mark">DOMINÓ</div>
          <div className="your-hand"><small>SUA MÃO <span>7 pedras</span></small><div className="hand-tiles">{sampleTiles.slice(0,6).map(([a,b],i)=>tile(a,b, i===2?'selected':''))}</div></div>
        </div>
      </div>
    </section>

    <section className="play-section">
      <div className="section-heading"><div><span className="eyebrow">VAMOS JOGAR?</span><h2>Entre na mesa</h2></div><span className="classic-tag">REGRAS CLÁSSICAS</span></div>
      <div className="entry-grid">
        <article className="entry-card create-card">
          <div className="card-icon"><Plus size={21}/></div><h3>Criar uma sala</h3><p>Abra uma mesa e convide seus amigos usando um código.</p>
          <label htmlFor="create-name">Como quer ser chamado?</label>
          <input id="create-name" value={playerName} onChange={e=>setPlayerName(e.target.value)} placeholder="Seu nome" maxLength={18}/>
          <button className="primary-btn" onClick={createRoom} disabled={busy}>{busy ? 'Aguarde…' : 'Criar sala'} <Plus size={17}/></button>
        </article>
        <article className="entry-card join-card">
          <div className="card-icon muted"><Users size={21}/></div><h3>Entrar em uma sala</h3><p>Já recebeu um convite? Informe o código para entrar na partida.</p>
          <label htmlFor="join-name">Seu nome</label>
          <input id="join-name" value={playerName} onChange={e=>setPlayerName(e.target.value)} placeholder="Seu nome" maxLength={18}/>
          <label htmlFor="room-code">Código da sala</label>
          <div className="code-input"><input id="room-code" value={roomCode} onChange={e=>setRoomCode(e.target.value.toUpperCase())} placeholder="EX: A7K9Q2" maxLength={6}/><Copy size={16}/></div>
          <button className="secondary-btn" onClick={joinRoom}>Entrar na sala <span>→</span></button>
        </article>
      </div>
      <div className="notice"><span className="notice-icon">{isSupabaseConfigured ? <Wifi size={17}/> : <WifiOff size={17}/>}</span><span>{notice}</span></div>
    </section>
    <footer><span>DOMINÓ SUPORTE</span><span>Feito para jogar junto. ♡</span><span>VERSÃO 0.1.0</span></footer>
  </main>
}