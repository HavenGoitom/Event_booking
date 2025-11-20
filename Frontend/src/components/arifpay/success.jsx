export default function Success(){
    return(
        <div style={{ padding: '20px', textAlign: 'center' }}>
            <h1>✅ Payment Successful!</h1>
            <p>Your booking has been confirmed. Check your email for details.</p>
            <button onClick={() => window.location.href = '/user/home'}>
                Return to Home
            </button>
        </div>
    )
}

