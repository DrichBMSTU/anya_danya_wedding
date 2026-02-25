document.addEventListener('DOMContentLoaded', () => {
    // ВАЖНО: URL опубликованного Google Apps Script Web App
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx5XcLZs5SKQX8QKjDs4qs0F2SKJoEfe2aBu-pumBuPuwxBaXoEokKHhft419IoF-A/exec';
    
    // --- Логика дедлайна ---
    // 20.04.2026 23:59 Europe/Moscow (UTC+3)
    const deadlineDate = new Date('2026-04-20T23:59:00+03:00').getTime();
    const form = document.getElementById('rsvp-form');
    const deadlineMessage = document.getElementById('deadline-message');
    
    if (Date.now() > deadlineDate) {
        form.style.display = 'none';
        deadlineMessage.className = 'deadline-active';
    }

    // --- Анимации при скролле ---
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('show');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

    // --- Логика формы (Скрытие алкоголя, если гость не придет) ---
    const presenceRadios = document.querySelectorAll('input[name="presence"]');
    const extraFields = document.getElementById('extra-fields');

    presenceRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'Не приду') {
                extraFields.style.display = 'none';
            } else {
                extraFields.style.display = 'block';
            }
        });
    });

    // Эксклюзивный чекбокс "Без алкоголя"
    const noAlcoholCheck = document.querySelector('.no-alcohol');
    const alcoholChecks = document.querySelectorAll('input[name="alcohol"]:not(.no-alcohol)');

    noAlcoholCheck.addEventListener('change', (e) => {
        if (e.target.checked) {
            alcoholChecks.forEach(cb => { cb.checked = false; cb.disabled = true; });
        } else {
            alcoholChecks.forEach(cb => { cb.disabled = false; });
        }
    });

    alcoholChecks.forEach(cb => {
        cb.addEventListener('change', () => {
            if (cb.checked) noAlcoholCheck.checked = false;
        });
    });

    // --- Отправка формы ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = document.getElementById('submit-btn');
        const statusDiv = document.getElementById('form-status');
        
        // Сбор данных
        const name = document.getElementById('name').value.trim();
        const presence = document.querySelector('input[name="presence"]:checked')?.value;
        const allergies = document.getElementById('allergies').value.trim();
        
        // Валидация алкоголя (только если гость придет)
        let alcoholSelection = [];
        if (presence === 'Приду') {
            document.querySelectorAll('input[name="alcohol"]:checked').forEach(cb => {
                alcoholSelection.push(cb.value);
            });
            
            if (alcoholSelection.length === 0) {
                statusDiv.innerHTML = '<span class="error-msg">Пожалуйста, выберите минимум один вариант алкоголя.</span>';
                return;
            }
        }

        const payload = {
            name: name,
            presence: presence,
            alcohol: alcoholSelection.join(', '),
            allergies: presence === 'Приду' ? allergies : ''
        };

        btn.disabled = true;
        btn.textContent = 'Отправка...';
        statusDiv.innerHTML = '';

        try {
            // Отправляем как text/plain, чтобы избежать проблем с CORS preflight
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.status === 'success') {
                if (result.mode === 'created') {
                    statusDiv.innerHTML = '<span class="success-msg">Спасибо! Ваш ответ сохранён.</span>';
                } else if (result.mode === 'updated') {
                    statusDiv.innerHTML = '<span class="success-msg">Ваш ответ успешно обновлён.</span>';
                }
                form.reset();
                extraFields.style.display = 'block'; // Сброс UI
                alcoholChecks.forEach(cb => cb.disabled = false);
            } else {
                throw new Error(result.message || 'Ошибка сервера');
            }
        } catch (error) {
            statusDiv.innerHTML = `<span class="error-msg">Произошла ошибка при отправке. Попробуйте еще раз или напишите нам.</span>`;
        } finally {
            btn.disabled = false;
            btn.textContent = 'Отправить ответ';
        }
    });

});

