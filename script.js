let els = {};
let date = Temporal.PlainDate.from('2010-03-04')
const WEEKS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
let curr_mode = 0; //year = 0, month = 1, day = 2, single = 3
let img_id = 0;

const TARGET_HEIGHT = 200;
const GAP = 8;

function wait_for_images(images) {
    const promises = Array.from(images).map(img => {
        return new Promise(resolve => {
            // If the browser has already loaded the image, resolve immediately
            if (img.complete) {
                resolve();
            } else {
                img.addEventListener('load', () => resolve());
                img.addEventListener('error', () => resolve()); // Resolve anyway on error to avoid hanging
            }
        });
    });
    
    return Promise.all(promises);
}

function get_cover_image(day_data) {
    let path = day_data[0].path;
    for (let img_i = 0; img_i < day_data.length; img_i++) {
        if (day_data[img_i].is_img) {
            path = day_data[img_i].path;
            break;
        }
    }

    return path;
}

function change_date(change) {
    let today = Temporal.Now.plainDateISO();
    if (curr_mode === 0) {
        date = date.add({ years: change });
        while (image_data?.[date.year] === undefined) {
            date = date.add({ years: change });
            if (date.year < 1970 || date.year > today.year) {
                break;
            }
        }
        show_year_view();
    }
    else if (curr_mode === 1) {
        date = date.add({ months: change });
        while (image_data?.[date.year]?.[date.month] === undefined) {
            date = date.add({ months: change });
            if (date.year < 1970 || date.year > today.year) {
                break;
            }
        }
        show_month_view();
    }
    else if (curr_mode === 2) {
        date = date.add({ days: change });
        while (image_data?.[date.year]?.[date.month]?.[date.day] === undefined) {
            date = date.add({ days: change });
            if (date.year < 1970 || date.year > today.year) {
                break;
            }
        }
        show_day_view();
    }
    else if (curr_mode === 3) {
        img_id += change
        while (image_data?.[date.year]?.[date.month]?.[date.day]?.[img_id] === undefined) {
            if (img_id >= image_data?.[date.year]?.[date.month]?.[date.day].length() || img_id < 0) {
                img_id = img_id < 0 ? 0 : image_data?.[date.year]?.[date.month]?.[date.day].length() - 1;
                date = date.add({ days: change });
            }
            else {
                img_id += 1
            }

            if (date.year < 1970 || date.year > today.year) {
                break;
            }
        }
        show_single_view();
    }
}

function selected_day(event) {
    date = date.with({ day: event.currentTarget.dataset.id});
    curr_mode = 2;

    show_day_view()
}

function selected_month(event) {
    if (event === null) {
        curr_mode = 1;
        show_month_view();
        return;
    }

    date = date.with({ month: event.currentTarget.dataset.id});
    curr_mode = 1;

    show_month_view();
}

function selected_year() {
    curr_mode = 0;

    show_year_view();
}

function show_month_weeks(week_box) {
    for (let i = 0; i < 7; i++) {
        let week = document.createElement('li');
        week.textContent = WEEKS[i];
        week_box.appendChild(week);
    }
}

function show_month_view() {
    els.day_view.classList.add('hidden');
    els.month_view.classList.remove('hidden');
    els.year_view.classList.add('hidden');
    els.single_view.classList.add('hidden');

    let year = date.year;
    let month = date.month;
    let month_data = {};
    if (image_data?.[year]?.[month] !== undefined) {
        month_data = image_data[year][month];
    }
    
    els.cal_label.textContent = date.toLocaleString('pt-BR', params={month: 'long', year: 'numeric'});

    let days = els.month_days;
    days.replaceChildren();

    let num_days = date.daysInMonth;
    let start_blanks = (date.with({ day: 1 }).dayOfWeek - 1) % 7 + 1
    let num_spaces = 7 * 6;

    for (let i = -start_blanks; i < num_spaces - start_blanks; i++) {
        let day = document.createElement('li');

        if ((i >= 0) && (i < num_days)) {
            let day_label = document.createElement('p');

            day_label.textContent = i + 1;
            day.appendChild(day_label);

            if (month_data?.[i + 1] !== undefined) {
                let image = document.createElement('img');
                image.src = get_cover_image(month_data[i + 1]);
                image.dataset.id = i + 1;
                image.addEventListener('click', (e) => {selected_day(e);});
                day.appendChild(image);
            }
        }
        else if (i === -start_blanks) {
            day.classList.add('blank-space');
            day.innerHTML = '<i class="material-symbols-outlined">event_repeat</i>';
            day.addEventListener('click', selected_year);
        }
        else {
            day.classList.add('blank-space');
        }

        days.appendChild(day);
    }
}

function show_year_view() {
    els.day_view.classList.add('hidden');
    els.month_view.classList.add('hidden');
    els.year_view.classList.remove('hidden');
    els.single_view.classList.add('hidden');

    let year = date.year;
    let year_data
    if (image_data?.[year] !== undefined) {
        year_data = image_data[year];
    }
    
    els.cal_label.textContent = date.toLocaleString('pt-BR', params = {year: 'numeric'});

    let months = els.year_months;
    months.replaceChildren();

    for (let i = 0; i < date.monthsInYear; i++) {
        let month = document.createElement('div');
        month.dataset.id = i + 1;
        month.addEventListener('click', (e) => {selected_month(e);})

        let month_label = document.createElement('h2');
        month_label.textContent = date.with({ month: i + 1 }).toLocaleString('pt-BR', params = {month: 'long'});
        month.appendChild(month_label)

        let month_days = document.createElement('ol');
        
        let month_date = date.with({ month: i + 1});
        let month_data;
        if (year_data?.[i + 1] !== undefined) {
            month_data = year_data[i + 1];
        }


        let num_days = month_date.daysInMonth;
        let start_blanks = month_date.with({ day: 1 }).dayOfWeek % 7
        let num_spaces = 7 * 6;
        for (let j = -start_blanks; j < num_spaces - start_blanks; j++) {
            let day = document.createElement('li');

            if ((j >= 0) && (j < num_days) && (month_data?.[j + 1] !== undefined)) {
                let day_data = month_data[j + 1];
                let image = document.createElement('img');
                image.src = get_cover_image(day_data);
                day.appendChild(image);
            }

            month_days.appendChild(day);
        }

        month.appendChild(month_days)

        months.appendChild(month);
    }
}

function show_day_view() {
    els.day_view.classList.remove('hidden');
    els.month_view.classList.add('hidden');
    els.year_view.classList.add('hidden');
    els.single_view.classList.add('hidden');

    let year = date.year;
    let month = date.month;
    let day = date.day;
    let day_data = [];
    if (image_data?.[year]?.[month]?.[day] !== undefined) {
        day_data = image_data[year][month][day];
    }
    
    els.cal_label.textContent = date.toLocaleString('pt-BR', params={month: 'long', year: 'numeric', day: 'numeric'}) + ` (${date.toLocaleString('pt-BR', params={weekday: 'short'})})`;

    let image_list = els.day_image_list;
    image_list.replaceChildren();

    let back_button = document.createElement('li');
    back_button.innerHTML = '<i class="material-symbols-outlined">event_repeat</i>';
    back_button.classList.add('day-back-button');
    back_button.addEventListener('click', () => {selected_month(null);});
    image_list.appendChild(back_button);

    for (const image_data of day_data) {
        let container = document.createElement('li');
        
        let image = document.createElement('img');
        image.src = image_data.path;

        container.appendChild(image);
        image_list.appendChild(container);
    }

    wait_for_images(image_list.querySelectorAll('img')).then(() => {
        justify_day_view(TARGET_HEIGHT, GAP);
    });
}

function justify_day_view(height, gap) {
    if (curr_mode !== 2) {
        return;
    }

    let image_list = els.day_image_list;
    let list_w = image_list.clientWidth - 25;
    let images = Array.from(image_list.children);

    let curr_row = [];
    let curr_row_w = 0;
    let extra_w = 0;

    images.forEach((item, i) => {
        const img = item.querySelector('img');

        if (img === null) {
            extra_w = item.clientWidth;
        }
        else {

        const ratio = img.naturalWidth / img.naturalHeight;
        const new_w = ratio * height;

        if ((curr_row_w + new_w + extra_w + (curr_row.length * gap)) > list_w) {
            let upscale = (list_w - (curr_row.length - 1) * gap) / (curr_row_w + extra_w);
            curr_row.forEach((row_item) => {
                row_item.img.style.width = `${row_item.new_w * upscale}px`;
                row_item.img.style.height = `${height * upscale}px`;
            });

            curr_row = [];
            curr_row_w = 0;
            extra_w = 0;
        }

        curr_row.push({ img: img, new_w: new_w });
        curr_row_w += new_w;

        }
    });

    if (curr_row.length > 0) {
        curr_row.forEach((row_item) => {
            row_item.img.style.width = `${row_item.new_w}px`;
            row_item.img.style.height = `${height}px`;
        });
    }
}

function show_single_view() {
    els.day_view.classList.add('hidden');
    els.month_view.classList.add('hidden');
    els.year_view.classList.add('hidden');
    els.single_view.classList.remove('hidden');

    let year = date.year;
    let month = date.month;
    let day = date.day;
    let single_img_data = {};
    if (image_data?.[year]?.[month]?.[day]?.[img_id] !== undefined) {
        single_img_data = image_data[year][month][day][img_id];
        els.single_img.src = single_img_data.path;
    } else {

        return;
    }

    let new_date = date.toPlainDateTime(second = `${String(single_img_data.h).padStart(2, '0')}:${String(single_img_data.m).padStart(2, '0')}:${String(single_img_data.s).padStart(2, '0')}`)

    els.cal_label.textContent = new_date.toLocaleString('pt-BR', params={month: 'long', year: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric'}) + ` (${date.toLocaleString('pt-BR', params={weekday: 'short'})})`;
}

document.addEventListener('DOMContentLoaded', () => {
    els = {
        month_view: document.getElementById('month-view'),
        month_weeks: document.getElementById('month-week-box'),
        month_days: document.getElementById('month-days-box'),
        
        year_view: document.getElementById('year-view'),
        year_months: document.getElementById('year-months-box'),
        
        day_view: document.getElementById('day-view'),
        day_image_list: document.getElementById('day-images'),

        single_view: document.getElementById('single-view'),
        single_img: document.getElementById('single-img'),

        prev_date: document.getElementById('prev-date'),
        next_date: document.getElementById('next-date'),
        cal_label: document.getElementById('cal-label')
    };
    els.prev_date.addEventListener('click', () => {change_date(-1)})
    els.next_date.addEventListener('click', () => {change_date(1)})
    
    show_month_weeks(els.month_weeks);

    show_year_view();
});

document.addEventListener('resize', () => {
    justify_day_view(TARGET_HEIGHT, GAP);
});