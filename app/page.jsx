'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { solicitudFacturaPlan, mercadoPagoPreferencia, createPqrs, getToken, getStoredUsuario } from '@/lib/alfaredApi';

export default function HomePage() {
  // Estados para menús flotantes y búsqueda (header)
  const [searchActive, setSearchActive] = useState(false);
  const [loginActive, setLoginActive] = useState(false);
  const [contactInfoActive, setContactInfoActive] = useState(false);
  const [navbarActive, setNavbarActive] = useState(false);

  useEffect(() => {
    let homeSwiper;
    let tries = 0;

    const initSwiper = () => {
      if (typeof window === 'undefined' || !window.Swiper) {
        if (tries < 40) {
          tries += 1;
          setTimeout(initSwiper, 100);
        }
        return;
      }
      homeSwiper = new window.Swiper('.home-slider', {
        loop: true,
        grabCursor: true,
        navigation: {
          nextEl: '.home-slider .swiper-button-next',
          prevEl: '.home-slider .swiper-button-prev',
        },
      });
    };

    initSwiper();

    const onScroll = () => {
      setNavbarActive(false);
      setSearchActive(false);
      setLoginActive(false);
      setContactInfoActive(false);
      const header = document.querySelector('.header');
      if (header) {
        if (window.scrollY > 10) header.classList.add('scrolled');
        else header.classList.remove('scrolled');
      }
    };
    window.addEventListener('scroll', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (homeSwiper?.destroy) homeSwiper.destroy(true, true);
    };
  }, []);

  // Estados para el Modal de Contratación de Planes
  const [modalPlanOpen, setModalPlanOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState({ title: '', price: '' });
  const [planForm, setPlanForm] = useState({ nombre: '', apellido: '', email: '', telefono: '', obs: '' });

  // Estados para el Formulario de Contacto
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', msg: '' });
  const [contactResult, setContactResult] = useState('');

  const abrirModalPlan = (title, price) => {
    setSelectedPlan({ title, price });
    setModalPlanOpen(true);
  };

  const handlePlanSubmit = async (e) => {
    e.preventDefault();
    if (!getToken()) {
      alert('Debes iniciar sesión con una cuenta cliente para contratar un plan. Te redirigimos a tu cuenta.');
      window.location.href = '/cuenta';
      return;
    }
    const u = getStoredUsuario();
    if (!u || u.tipo?.toLowerCase() !== 'cliente') {
      alert('Solo las cuentas con rol cliente pueden contratar planes.');
      return;
    }
    const res = await solicitudFacturaPlan({
      plan_key: selectedPlan.title === 'Plan Solo Internet' ? 'solo' : selectedPlan.title === 'Plan Internet + TV' ? 'tv' : 'diferente',
      plan_title: selectedPlan.title,
      nombre: planForm.nombre,
      apellido: planForm.apellido,
      email: planForm.email,
      telefono: planForm.telefono,
      observaciones: planForm.obs,
    });
    if (!res || !res.success || !res.data || !res.data.factura) {
      alert(res?.error || 'No se pudo generar la factura del plan.');
      return;
    }
    const facturaId = res.data.factura.id_factura;
    const pref = await mercadoPagoPreferencia(facturaId);
    if (pref && pref.success && pref.data && pref.data.init_point) {
      window.location.href = pref.data.init_point;
      return;
    }
    alert(pref?.error || 'La factura quedó creada, pero no se abrió Mercado Pago. Puedes pagarla desde la página Pagos con tu ID de usuario.');
    setModalPlanOpen(false);
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.msg) {
      setContactResult('Completa nombre, correo y mensaje');
      return;
    }
    setContactResult('Enviando solicitud...');
    const res = await createPqrs('SUGERENCIA', `${contactForm.name} - ${contactForm.msg}`, contactForm.name ? 0 : 0);
    if (res && res.success) {
      setContactResult('Mensaje enviado. ¡Gracias por contactarnos!');
      setContactForm({ name: '', email: '', phone: '', msg: '' });
    } else {
      setContactResult(res?.error || 'No se pudo enviar el mensaje. Inténtalo más tarde.');
    }
  };

  return (
    <>
      {/* Header section */}
      <header className="header">
        <Link href="/" className="logo">AlfaRed<span> Energia y Telecomunicaciones</span></Link>

        <nav className={`navbar ${navbarActive ? 'active' : ''}`}>
          <Link href="#home">Inicio</Link>
          <Link href="#about">Nosotros</Link>
          <Link href="#services">Servicios</Link>
          <Link href="#projects">Proyectos</Link>
          <Link href="#pricing">Planes</Link>
          <Link href="#contact">Contactos</Link>
          <Link href="/pagos">Pagos</Link>
          <Link href="/pqrs">PQRS</Link>
          <Link href="/cuenta">Mi cuenta</Link>
          <Link href="/pqrs-gestion">Gestión PQRS</Link>
        </nav>

        <div className="icons">
          <div
            id="menu-btn"
            className="fas fa-bars"
            onClick={() => {
              setNavbarActive((v) => !v);
              setSearchActive(false);
              setLoginActive(false);
            }}
          ></div>
          <div id="info-btn" className="fas fa-info-circle" onClick={() => setContactInfoActive(true)}></div>
          <div
            id="search-btn"
            className="fas fa-search"
            onClick={() => {
              setSearchActive((v) => !v);
              setNavbarActive(false);
              setLoginActive(false);
            }}
          ></div>
          <div
            id="login-btn"
            className="fas fa-user"
            onClick={() => {
              setLoginActive((v) => !v);
              setNavbarActive(false);
              setSearchActive(false);
            }}
          ></div>
        </div>

        <form action="" className={`search-form ${searchActive ? 'active' : ''}`} onSubmit={(e) => e.preventDefault()}>
          <input type="search" name="" placeholder="search here..." id="search-box" />
          <label htmlFor="search-box" className="fas fa-search"></label>
        </form>

        <div className={`login-form ${loginActive ? 'active' : ''}`}>
          <h3>Mi cuenta</h3>
          <p className="muted" style={{ fontSize: '1.35rem', padding: '.5rem 0' }}>
            Inicia sesión o crea una cuenta sin perder el acceso público a Pagos y PQRS por ID.
          </p>
          <Link href="/cuenta" className="btn" style={{ display: 'inline-block', marginTop: '.5rem' }}>Ir a Mi cuenta</Link>
        </div>
      </header>

      {/* Contact Info Sidebar */}
      <div className={`contact-info ${contactInfoActive ? 'active' : ''}`}>
        <div id="close-contact-info" className="fas fa-times" onClick={() => setContactInfoActive(false)}></div>
        <div className="info">
          <i className="fas fa-phone"></i>
          <h3>Número celular</h3>
          <p>+57 316 8688689</p>
          <p>+57 312 3835811</p>
        </div>
        <div className="info">
          <i className="fas fa-envelope"></i>
          <h3>Correo electrónico</h3>
          <p>alfaredtelcom@gmail.com</p>
        </div>
        <div className="info">
          <i className="fas fa-map-marker-alt"></i>
          <h3>Dirección de oficina</h3>
          <p>Por Definir</p>
        </div>
      </div>

      {/* Home section */}
      <section className="home" id="home">
        <div className="swiper home-slider">
          <div className="swiper-wrapper">
            <section
              className="swiper-slide slide"
              style={{ background: 'url(/assets/iconos/BG1.png) no-repeat' }}
            >
              <div className="content">
                <h3>Alfared: Sin limites</h3>
                <p>
                  Olvídate de las caídas de red y vive la tranquilidad de tener internet que responde a tus necesidades todos los días.
                </p>
                <Link href="#contact" className="btn">Contáctanos</Link>
              </div>
            </section>
            <section
              className="swiper-slide slide"
              style={{ background: 'url(/assets/iconos/BG2.png) no-repeat' }}
            >
              <div className="content">
                <h3>Alfared: Futuro</h3>
                <p>
                  Accede a la mejor tecnología de conectividad y lleva tu vida digital al siguiente nivel estés donde estés.
                </p>
                <Link href="#contact" className="btn">Contáctanos</Link>
              </div>
            </section>
          </div>
          <div className="swiper-button-next"></div>
          <div className="swiper-button-prev"></div>
        </div>
      </section>

      {/* About section */}
      <section className="about" id="about">
        <h1 className="heading">Nosotros</h1>
        <div className="row">
          <div className="video">
            <iframe
              src="https://www.youtube.com/embed/QyhwSYhX09s?autoplay=1&mute=1&loop=1&playlist=QyhwSYhX09s"
              title="Video de presentación"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              style={{ width: '100%', aspectRatio: '16 / 9' }}
            ></iframe>
          </div>
          <div className="content">
            <h3>Conectamos tu mundo con confianza y tecnología</h3>
            <p>
              En <b>Alfared</b> ofrecemos soluciones integrales en <b>internet, televisión, tecnología y servicios eléctricos</b>, garantizando calidad y confianza en cada proyecto.
            </p>
            <Link href="#services" className="btn">Conoce más</Link>
          </div>
        </div>

        <div className="box-container">
          <div className="box">
            <h3>5+</h3>
            <p>Años de experiencia</p>
          </div>
          <div className="box">
            <h3>100</h3>
            <p>Proyectos realizados</p>
          </div>
          <div className="box">
            <h3>600</h3>
            <p>Clientes satisfechos</p>
          </div>
          <div className="box">
            <h3>3</h3>
            <p>Profesionales Activos</p>
          </div>
        </div>
      </section>

      {/* Services section */}
      <section className="services" id="services">
        <h1 className="heading">Servicios</h1>
        <div className="box-container">
          <div className="box">
            <img src="/assets/imagenes/Interner_Logo.png" alt="Internet" />
            <h3>Internet</h3>
            <p>Conexión estable mediante fibra óptica o radioenlace, según la ubicación de tu vivienda, para garantizar la mejor cobertura.</p>
          </div>
          <div className="box">
            <img src="/assets/imagenes/television.png" alt="Televisión" />
            <h3>Televisión</h3>
            <p>Disfruta de canales digitales entre nacionales, entretenimiento y deportes, con la mejor calidad de imagen.</p>
          </div>
          <div className="box">
            <img src="/assets/imagenes/tecnologia.png" alt="Tecnología" />
            <h3>Tecnología</h3>
            <p>Venta de routers y equipos tecnológicos especializados en redes para mejorar tu experiencia de conectividad.</p>
          </div>
          <div className="box">
            <img src="/assets/imagenes/hogar.png" alt="Soluciones eléctricas" />
            <h3>Soluciones eléctricas</h3>
            <p>Servicio integral en instalaciones y reparaciones eléctricas, pensado para hogares y negocios.</p>
          </div>
        </div>
      </section>

      {/* Projects section */}
      <section className="projects" id="projects">
        <h1 className="heading">Proyectos</h1>
        <div className="box-container">
          <a href="/assets/iconos/CryptoMining.png" className="box">
            <div className="image">
              <img src="/assets/iconos/CryptoMining.png" alt="Expansión de Fibra Óptica" />
            </div>
            <div className="content">
              <div className="info">
                <h3>Expansión de Fibra Óptica</h3>
                <p>Próximamente ampliaremos nuestra cobertura para llegar a más hogares y negocios.</p>
              </div>
              <i className="fas fa-plus"></i>
            </div>
          </a>
          <a href="/assets/iconos/ChatbotE.png" className="box">
            <div className="image">
              <img src="/assets/iconos/ChatbotE.png" alt="Agenda y Soporte Técnico" />
            </div>
            <div className="content">
              <div className="info">
                <h3>Agenda y Soporte Técnico</h3>
                <p>Estamos desarrollando un sistema para programar instalaciones, servicios y reportes de daños.</p>
              </div>
              <i className="fas fa-plus"></i>
            </div>
          </a>
          <a href="/assets/iconos/BankingS.png" className="box">
            <div className="image">
              <img src="/assets/iconos/BankingS.png" alt="Pagos en Línea" />
            </div>
            <div className="content">
              <div className="info">
                <h3>Pagos en Línea</h3>
                <p>Muy pronto podrás realizar tus pagos de manera rápida y segura desde internet.</p>
              </div>
              <i className="fas fa-plus"></i>
            </div>
          </a>
        </div>
      </section>

      {/* Pricing section */}
      <section className="pricing" id="pricing">
        <h1 className="heading">Planes</h1>
        <div className="box-container">
          <div className="box">
            <i className="fas fa-home"></i>
            <h3>Plan Solo Internet</h3>
            <div className="price"><span>$</span>50.000<span>/COP</span></div>
            <div className="list">
              <p>100 Megas + ONU + Router + Antena</p>
            </div>
            <button type="button" className="btn" onClick={() => abrirModalPlan('Plan Solo Internet', '50000')}>Solicita Plan</button>
          </div>

          <div className="box">
            <i className="fas fa-building"></i>
            <h3>Plan Internet + TV</h3>
            <div className="price"><span>$</span>65.000<span>/COP</span></div>
            <div className="list">
              <p>100 Megas + ONU + 80 Canales (2 conexiones)</p>
            </div>
            <button type="button" className="btn" onClick={() => abrirModalPlan('Plan Internet + TV', '65000')}>Solicita Plan</button>
          </div>

          <div className="box">
            <i className="fas fa-city"></i>
            <h3>Plan Diferente</h3>
            <div className="price"><span>$</span>0<span>/COP</span></div>
            <div className="list">
              <p>Plan a tu medida, contáctanos y te asesoramos.</p>
            </div>
            <button type="button" className="btn" onClick={() => abrirModalPlan('Plan a medida', '0')}>Solicita Plan</button>
          </div>
        </div>
      </section>

      {/* Modal Contratar Plan */}
      {modalPlanOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 10050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#fff', padding: '2rem', borderRadius: '1rem', maxWidth: '520px', width: '100%', position: 'relative' }}>
            <h2 className="heading" style={{ marginBottom: '.5rem' }}>Contratar: {selectedPlan.title}</h2>
            <p className="muted" style={{ fontSize: '1.35rem', marginBottom: '1rem' }}>Precio: ${selectedPlan.price} COP</p>
            <form onSubmit={handlePlanSubmit}>
              <label style={{ display: 'block', marginBottom: '.25rem' }}>Nombre</label>
              <input type="text" className="box" value={planForm.nombre} onChange={e => setPlanForm({...planForm, nombre: e.target.value})} required style={{ width: '100%', padding: '.8rem', marginBottom: '1rem', border: '1px solid #ccc', borderRadius: '.4rem' }} />
              
              <label style={{ display: 'block', marginBottom: '.25rem' }}>Apellido</label>
              <input type="text" className="box" value={planForm.apellido} onChange={e => setPlanForm({...planForm, apellido: e.target.value})} required style={{ width: '100%', padding: '.8rem', marginBottom: '1rem', border: '1px solid #ccc', borderRadius: '.4rem' }} />
              
              <label style={{ display: 'block', marginBottom: '.25rem' }}>Correo</label>
              <input type="email" className="box" value={planForm.email} onChange={e => setPlanForm({...planForm, email: e.target.value})} required style={{ width: '100%', padding: '.8rem', marginBottom: '1rem', border: '1px solid #ccc', borderRadius: '.4rem' }} />
              
              <label style={{ display: 'block', marginBottom: '.25rem' }}>Teléfono / WhatsApp</label>
              <input type="tel" className="box" value={planForm.telefono} onChange={e => setPlanForm({...planForm, telefono: e.target.value})} required style={{ width: '100%', padding: '.8rem', marginBottom: '1rem', border: '1px solid #ccc', borderRadius: '.4rem' }} />

              <div style={{ display: 'flex', gap: '.75rem', marginTop: '1rem' }}>
                <button type="submit" className="btn" style={{ background: '#4CAF50', color: '#fff', border: 'none', padding: '.8rem 1.5rem', borderRadius: '.4rem', cursor: 'pointer' }}>Continuar al pago</button>
                <button type="button" className="btn" onClick={() => setModalPlanOpen(false)} style={{ background: '#666', color: '#fff', border: 'none', padding: '.8rem 1.5rem', borderRadius: '.4rem', cursor: 'pointer' }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contact section */}
      <section className="contact" id="contact">
        <h1 className="heading">Contáctanos</h1>
        <div className="row">
          <iframe
            className="map"
            src="https://www.google.com/maps?q=Popay%C3%A1n%2C%20Colombia&output=embed"
            allowFullScreen=""
            loading="lazy"
            title="Mapa Popayán"
          ></iframe>

          <form onSubmit={handleContactSubmit}>
            <h3>Ingresa tu información</h3>
            <input type="text" placeholder="Nombre" className="box" value={contactForm.name} onChange={e => setContactForm({...contactForm, name: e.target.value})} />
            <input type="email" placeholder="Correo" className="box" value={contactForm.email} onChange={e => setContactForm({...contactForm, email: e.target.value})} />
            <input type="number" placeholder="Celular" className="box" value={contactForm.phone} onChange={e => setContactForm({...contactForm, phone: e.target.value})} />
            <textarea placeholder="Mensaje" className="box" cols="30" rows="10" value={contactForm.msg} onChange={e => setContactForm({...contactForm, msg: e.target.value})}></textarea>
            <button type="submit" className="btn">Enviar</button>
            {contactResult && <p className="muted" style={{ marginTop: '1rem' }}>{contactResult}</p>}
          </form>
        </div>
      </section>

      {/* Footer */}
      <section className="footer">
        <div className="links">
          <Link className="btn" href="#home">Inicio</Link>
          <Link className="btn" href="#about">Nosotros</Link>
          <Link className="btn" href="#services">Servicios</Link>
          <Link className="btn" href="#projects">Proyectos</Link>
          <Link className="btn" href="#pricing">Planes</Link>
          <Link className="btn" href="#contact">Contactos</Link>
          <Link className="btn" href="/pagos">Pagos</Link>
          <Link className="btn" href="/pqrs">PQRS</Link>
          <Link className="btn" href="/cuenta">Mi cuenta</Link>
          <Link className="btn" href="/pqrs-gestion">Gestión PQRS</Link>
        </div>
        <div className="credit">
          ¡<span>ALFARED </span> MÁS QUE INTERNET, SOLUCIONES QUE TE ACERCAN AL FUTURO!
        </div>
      </section>
    </>
  );
}