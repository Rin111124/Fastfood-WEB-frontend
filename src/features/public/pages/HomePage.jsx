import NewsSection from '../components/home/NewsSection'

const HomePage = () => {
  return (
    <div className="container py-5">
      <section className="mb-5">
        <h2 className="h3 mb-4">Tin tức & Khuyến mãi</h2>
        <NewsSection />
      </section>
    </div>
  )
}

export default HomePage