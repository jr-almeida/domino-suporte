import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import { Copy, Crown, Gamepad2, Plus, Users, Wifi, WifiOff, ArrowLeft, Check } from 'lucide-react'

function getPlayerToken() {
  let token = localStorage.getItem('domino_player_token')
  if (!token) {
    token = crypto.randomUUID()
    localStorage.setItem('domino_player_token', token)
  }
  return token
}

export default function App() {
  const [playerName, setPlayerName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [room, setRoom] = useState(null)
  const [players, setPlayers] = useState([])
  const [queue, setQueue] = useState([])
  const [notice, setNotice] = useState('Crie uma sala ou entre com um código para chamar seus amigos.')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const loadLobby = async (roomId) => {
    const { data, error } = await supabase.from('room_players').select('id, display_name, seat, is_host').eq('room_id', roomId).order('seat')
    if (error) throw error
    setPlayers(data || [])
    const { data: waiting, error: queueError } = await supabase.from('room_queue').select('id, display_name, queue_order, joined_at').eq('room_id', roomId).order('queue_order')
    if (queueError) throw queueError
    setQueue(waiting || [])
  }

  const enterRoomView = async (result) => {
    setRoom(result)
    setRoomCode(result.code)
    await loadLobby(result.room_id)
    setNotice(result.queued ? 'Sala cheia! Você entrou no final da fila de espera.' : 'Você está na mesa! Compartilhe o convite com seus amigos.')
  }

  useEffect(() => {
    if (!room?.room_id || !supabase) return
    const channel = supabase.channel(`lobby-${room.room_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${room.room_id}` }, () => loadLobby(room.room_id).catch(() => {}))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${room.room_id}` }, () => loadLobby(room.room_id).catch(() => {}))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_queue', filter: `room_id=eq.${room.room_id}` }, () => loadLobby(room.room_id).catch(() => {}))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [room?.room_id])

  const createRoom = async () => {
    if (!playerName.trim()) return setNotice('Digite seu nome antes de criar uma sala.')
    if (!isSupabaseConfigured) return setNotice('Configure a chave pública do Supabase para ativar as salas online.')
    setBusy(true)
    try {
      const { data, error } = await supabase.rpc('create_domino_room', { p_display_name: playerName.trim(), p_player_token: getPlayerToken() })
      if (error) throw error
      await enterRoomView(data)
    } catch (error) {
      setNotice(error.message || 'Não foi possível criar a sala. Confira a configuração do banco.')
    } finally { setBusy(false) }
  }

  const joinRoom = async () => {
    if (!playerName.trim() || !roomCode.trim()) return setNotice('Informe seu nome e o código da sala.')
    if (!isSupabaseConfigured) return setNotice('Configure a chave pública do Supabase para entrar em salas.')
    setBusy(true)
    try {
      const { data, error } = await supabase.rpc('join_domino_room', { p_code: roomCode.trim().toUpperCase(), p_display_name: playerName.trim(), p_player_token: getPlayerToken() })
      if (error) throw error
      await enterRoomView(data)
    } catch (error) {
      setNotice(error.message || 'Não foi possível entrar na sala.')
    } finally { setBusy(false) }
  }

  const copyInvite = async () => {
    const invite = `${window.location.origin}/?sala=${room.code}`
    await navigator.clipboard.writeText(invite)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const leaveLobby = () => {
    setRoom(null)
    setPlayers([])
    setQueue([])
    setNotice('Você saiu da visualização da sala. Seu lugar permanece reservado até o momento.')
  }

  return <main className="app-shell">
    <header className="topbar">
      <a className="brand" href="#"><span className="brand-mark"><Gamepad2 size={21}/></span><span>DOMINÓ<span className="brand-light">SUPORTE</span></span></a>
      <div className="online-status"><span className={isSupabaseConfigured ? 'status-dot on' : 'status-dot'} />{isSupabaseConfigured ? 'Supabase configurado' : 'Aguardando configuração'}</div>
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
          <div className="chain"><div className="tile"><span>6</span><i/><span>6</span></div><div className="tile"><span>6</span><i/><span>4</span></div><div className="tile"><span>4</span><i/><span>2</span></div><div className="tile"><span>2</span><i/><span>0</span></div><div className="tile"><span>0</span><i/><span>5</span></div></div>
          <div className="center-mark">DOMINÓ</div>
          <div className="your-hand"><small>SUA MÃO <span>7 pedras</span></small><div className="hand-tiles">{[6,4,2,0,5,3].map((n,i)=><div className={`tile ${i===2?'selected':''}`} key={i}><span>{n}</span><i/><span>{(n+1)%7}</span></div>)}</div></div>
        </div>
      </div>
    </section>

    <section className="play-section">
      {room ? <>
        <div className="section-heading"><div><span className="eyebrow">SALA DE ESPERA</span><h2>Convide sua dupla</h2></div><span className="classic-tag">CÓDIGO {room.code}</span></div>
        <div className="entry-card lobby-card">
          <div className="lobby-top"><div><h3>Sua mesa está aberta</h3><p>Compartilhe o convite. A sala comporta quatro jogadores.</p></div><button className="secondary-btn copy-btn" onClick={copyInvite}>{copied ? <Check size={16}/> : <Copy size={16}/>} {copied ? 'Copiado!' : 'Copiar convite'}</button></div>
          <div className="room-code-display">{room.code.split('').map((c,i)=><span key={i}>{c}</span>)}</div>
          <div className="players-heading"><b><Users size={16}/> Jogadores</b><span>{players.length}/4</span></div>
          <div className="seat-grid">{[0,1,2,3].map(seat=>{const p=players.find(x=>x.seat===seat);return <div className={`seat ${p?'occupied':''}`} key={seat}><div className="seat-avatar">{p ? p.display_name.slice(0,1).toUpperCase() : '+'}</div><div><b>{p?.display_name || 'Aguardando jogador'}</b><small>{p ? (p.is_host?'Anfitrião':`Lugar ${seat+1}`) : `Lugar ${seat+1} disponível`}</small></div>{p?.is_host && <Crown size={15}/>}</div>})}</div>
          <div className="queue-panel">
            <div className="players-heading"><b><Users size={16}/> Fila de espera</b><span>{queue.length} aguardando</span></div>
            {queue.length ? <div className="queue-list">{queue.map((person, index) => <div className="queue-person" key={person.id}><span className="queue-number">{index + 1}</span><b>{person.display_name}</b><small>Ordem de chegada</small></div>)}</div> : <p className="queue-empty">Ninguém aguardando. Quando a mesa estiver cheia, novos jogadores entram aqui.</p>}
          </div>
          <div className="lobby-actions"><button className="secondary-btn" onClick={leaveLobby}><ArrowLeft size={16}/> Voltar</button><span>Jogadores adicionais entram automaticamente na fila.</span></div>
        </div>
      </> : <>
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
            <button className="secondary-btn" onClick={joinRoom} disabled={busy}>Entrar na sala <span>→</span></button>
          </article>
        </div>
      </>}
      <div className="notice"><span className="notice-icon">{isSupabaseConfigured ? <Wifi size={17}/> : <WifiOff size={17}/>}</span><span>{notice}</span></div>
    </section>
    <footer><span>DOMINÓ SUPORTE</span><span>Feito para jogar junto. ♡</span><span>VERSÃO 0.2.0</span></footer>
  </main>
}
