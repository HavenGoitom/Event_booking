export default function Failed(){
    return(
        <div style={{ padding: '20px', textAlign: 'center' }}>
            <h1>❌ Payment Failed</h1>
            <p>Failed to complete the booking. Please try again.</p>
            <button onClick={() => window.location.href = '/user/home'}>
                Return to Home
            </button>
        </div>
    )
}
